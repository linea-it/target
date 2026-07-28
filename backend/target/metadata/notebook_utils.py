import base64
import io
import json
import math
import traceback as tb
from contextlib import redirect_stderr
from contextlib import redirect_stdout
from decimal import Decimal
from pathlib import Path

import nbformat
from nbconvert import HTMLExporter

from target.metadata.api.serializers import NestedTableSerializer
from target.metadata.models import Table

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore[assignment]

try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None  # type: ignore[assignment]

_NULL_STRINGS = frozenset({"", "none", "nan", "null", "undefined", "na", "n/a"})


def _is_nullish(value):  # noqa: PLR0911
    if value is None:
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, str):
        return value.strip().lower() in _NULL_STRINGS or value == "None"
    if isinstance(value, float):
        return not math.isfinite(value)
    if np is not None and type(value).__module__ == "numpy":
        if isinstance(value, np.floating):
            return not np.isfinite(value)
        return False
    if isinstance(value, Decimal):
        return value.is_nan() or value.is_infinite()
    return False


def _sanitize_scalar(value):
    if _is_nullish(value):
        return None
    if type(value).__module__ == "numpy":
        return value.item()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _meta_field(value):
    if _is_nullish(value):
        return None
    return str(value)


def sanitize_data(data, bigint_columns=None):
    if isinstance(data, list):
        return [sanitize_data(item, bigint_columns) for item in data]
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                result[key] = sanitize_data(value, bigint_columns)
            elif _is_nullish(value):
                result[key] = None
            elif (
                bigint_columns
                and key in bigint_columns
                and isinstance(value, int)
                and value > 9007199254740991  # noqa: PLR2004
            ):
                result[key] = str(value)
            else:
                result[key] = _sanitize_scalar(value)
        return result
    return data


def _figure_has_content(fig):
    return any(ax.has_data() for ax in fig.axes)


def _notebook_for_display(nb):
    """Keep markdown and figure outputs only (no code source or stdout)."""
    display_cells = []
    for cell in nb.cells:
        if cell.cell_type == "markdown":
            display_cells.append(cell)
            continue
        if cell.cell_type != "code":
            continue

        outputs = [
            output
            for output in cell.outputs
            if output.get("output_type") in ("display_data", "error")
            and (
                output.get("output_type") == "error"
                or any(
                    mime.startswith("image/")
                    for mime in output.get("data", {})
                )
            )
        ]
        if not outputs:
            continue

        display_cell = nbformat.v4.new_code_cell(source="")
        display_cell.outputs = outputs
        display_cells.append(display_cell)

    display_nb = nbformat.v4.new_notebook(cells=display_cells)
    display_nb.metadata = nb.metadata
    return display_nb


def _execute_notebook_inprocess(nb):
    """Execute notebook code cells in-process, capturing outputs."""
    namespace = {}

    # Ensure matplotlib uses a non-interactive backend before any import
    exec("import matplotlib; matplotlib.use('Agg')", namespace)  # noqa: S102

    for execution_count, cell in enumerate(nb.cells, start=1):
        if cell.cell_type != "code":
            continue

        cell.outputs = []
        cell.execution_count = execution_count

        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()

        try:
            with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                exec(cell.source, namespace)  # noqa: S102

            # Capture any matplotlib figures produced by this cell
            if plt is not None:
                for fig_num in list(plt.get_fignums()):
                    fig = plt.figure(fig_num)
                    if not _figure_has_content(fig):
                        continue
                    try:
                        buf = io.BytesIO()
                        fig.savefig(buf, format="png", bbox_inches="tight")
                        img_b64 = base64.b64encode(buf.getvalue()).decode()
                        cell.outputs.append(
                            nbformat.v4.new_output(
                                output_type="display_data",
                                data={"image/png": img_b64, "text/plain": "<Figure>"},
                                metadata={},
                            ),
                        )
                    except Exception as fig_exc:  # noqa: BLE001
                        cell.outputs.append(
                            nbformat.v4.new_output(
                                output_type="error",
                                ename=type(fig_exc).__name__,
                                evalue=str(fig_exc),
                                traceback=tb.format_exception(
                                    type(fig_exc),
                                    fig_exc,
                                    fig_exc.__traceback__,
                                ),
                            ),
                        )
                plt.close("all")

        except Exception as exc:  # noqa: BLE001
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="error",
                    ename=type(exc).__name__,
                    evalue=str(exc),
                    traceback=tb.format_exception(type(exc), exc, exc.__traceback__),
                ),
            )

        stdout_val = stdout_buf.getvalue()
        stderr_val = stderr_buf.getvalue()

        if stdout_val:
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="stream",
                    name="stdout",
                    text=stdout_val,
                ),
            )
        if stderr_val:
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="stream",
                    name="stderr",
                    text=stderr_val,
                ),
            )


CLUSTER_NOTEBOOK_TEMPLATE = (
    Path(__file__).parent / "notebooks" / "cluster_detail_wazp_y6.ipynb"
)

CATALOG_NOTEBOOK_TEMPLATE = (
    Path(__file__).parent / "notebooks" / "catalog_qa_wazp_y6.ipynb"
)


def _inject_notebook_variables(nb, replacements):
    for cell in nb.cells:
        source = cell.source
        for key, value in replacements.items():
            source = source.replace(f"{{{{{key}}}}}", value)
        cell.source = source


def _prepare_cluster_notebook(table, request=None, viewset=None):
    """Prepare cluster detail notebook with injected data."""
    if request is None:
        request = _FakeRequest(table.schema.owner)

    if viewset is None:
        from target.metadata.api.views import (  # noqa: I001, PLC0415
            UserTableViewSet,
        )

        viewset = UserTableViewSet()
        viewset.request = request

    main_table_metadata = NestedTableSerializer(
        table,
        context={"request": request},
    ).data

    ucds = viewset.get_table_ucds(table)
    url_filters = viewset.parse_filters(request.query_params if request else {})

    main_record, _ = viewset.query_data(
        table=table,
        limit=1,
        offset=0,
        url_filters=url_filters,
        ordering=None,
        ucds=ucds,
    )
    if len(main_record) != 1:
        return None, {"error": "Record not found", "status": 404}

    main_record = main_record[0]
    related_table_metadata = None
    related_table_data = []

    if table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
        if not table.related_table:
            return None, {
                "error": "Related table must be set for cluster catalogs.",
                "status": 400,
            }

        related_table_metadata = NestedTableSerializer(
            table.related_table,
            context={"request": request},
        ).data

        cross_id_property = main_table_metadata.get("related_property_id")
        related_filters = {
            cross_id_property: main_record[main_table_metadata.get("property_id")],
        }

        related_table_data, _count = viewset.query_data(
            table=table.related_table,
            limit=None,
            offset=0,
            url_filters=related_filters,
            ordering=None,
            ucds=related_table_metadata.get("ucds"),
        )

    with CLUSTER_NOTEBOOK_TEMPLATE.open() as f:
        nb = nbformat.read(f, as_version=4)

    cluster_id = main_record.get("meta_id") or main_record.get("id") or "unknown"

    replacements = {
        "cluster_id": str(cluster_id),
        "main_table_metadata": json.dumps(
            main_table_metadata,
            allow_nan=False,
        ),
        "main_record": json.dumps(main_record, allow_nan=False),
        "related_table_metadata": json.dumps(
            related_table_metadata,
            allow_nan=False,
        ),
        "related_table_data": json.dumps(
            related_table_data,
            allow_nan=False,
        ),
    }
    _inject_notebook_variables(nb, replacements)

    context = {
        "main_record": main_record,
        "related_table_data": related_table_data,
        "notebook": nb,
    }
    return context, None


class _FakeRequest:
    """Minimal request-like object for serializers outside an HTTP context."""

    def __init__(self, user):
        self.user = user


def _prepare_catalog_notebook(table, request=None):
    """Prepare catalog QA notebook with injected metadata."""
    if request is None:
        request = _FakeRequest(table.schema.owner)

    main_table_metadata = NestedTableSerializer(
        table,
        context={"request": request},
    ).data

    with CATALOG_NOTEBOOK_TEMPLATE.open() as f:
        nb = nbformat.read(f, as_version=4)

    replacements = {
        "table_metadata": json.dumps(
            main_table_metadata,
            allow_nan=False,
        ),
        "catalog_name": str(table.title).upper(),
    }
    _inject_notebook_variables(nb, replacements)

    return {"notebook": nb}


def _render_notebook_html(nb):
    """Execute notebook and return HTML for display."""
    _execute_notebook_inprocess(nb)

    display_nb = _notebook_for_display(nb)
    exporter = HTMLExporter()
    exporter.exclude_input = True
    exporter.exclude_input_prompt = True
    exporter.exclude_output_prompt = True
    html, _ = exporter.from_notebook_node(display_nb)
    return html


def _notebook_to_ipynb_string(nb):
    """Return notebook as .ipynb string."""
    return nbformat.writes(nb)

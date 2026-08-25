import json

import numpy as np

from target.metadata.api.views import _meta_field
from target.metadata.api.views import sanitize_data
from target.metadata.notebook_utils import _is_nullish


def test_is_nullish_strings_and_floats():
    assert _is_nullish(None)
    assert _is_nullish(float("nan"))
    assert _is_nullish("nan")
    assert _is_nullish("NaN")
    assert _is_nullish("NULL")
    assert _is_nullish("")
    assert not _is_nullish("0.66")
    assert not _is_nullish(28.23)


def test_is_nullish_numpy():
    assert _is_nullish(np.float64("nan"))
    assert not _is_nullish(np.float64(1.5))


def test_sanitize_data_normalizes_nullish_values():
    zphot = 0.66
    row = {
        "zspec": "nan",
        "zphot": zphot,
        "ra": "28.23",
        "bad": float("nan"),
        "nested": {"x": "null"},
    }
    clean = sanitize_data(row)
    assert clean["zspec"] is None
    assert clean["bad"] is None
    assert clean["nested"]["x"] is None
    assert clean["zphot"] == zphot
    assert clean["ra"] == "28.23"
    json.dumps(clean, allow_nan=False)


def test_meta_field():
    assert _meta_field("nan") is None
    assert _meta_field(28.235) == "28.235"

"""Regression test for MyDB.total_size_tables(): it used to raise
TypeError: 'NoneType' object is not subscriptable for any user whose mydb
schema exists but has no tables yet (fetchone_dict returns None when the
GROUP BY query matches zero rows, not a dict with a None total_bytes) -
found while testing issue #197's quota check against a schema with nothing
materialized in it yet.
"""

import re
from unittest import mock

import pytest
from sqlalchemy import Column
from sqlalchemy import Float
from sqlalchemy import MetaData
from sqlalchemy import Table
from sqlalchemy.dialects import postgresql

from dblinea.mydb import MyDB


def _mydb():
    with mock.patch.object(MyDB, "__init__", return_value=None):
        db = MyDB()
    db.schema = "mydb_someuser"
    return db


def test_total_size_tables_returns_zero_for_schema_with_no_tables():
    db = _mydb()
    with mock.patch.object(db, "fetchone_dict", return_value=None):
        assert db.total_size_tables() == 0


def test_total_size_tables_returns_zero_when_total_bytes_is_null():
    db = _mydb()
    with mock.patch.object(db, "fetchone_dict", return_value={"total_bytes": None}):
        assert db.total_size_tables() == 0


def test_total_size_tables_returns_the_sum():
    db = _mydb()
    with mock.patch.object(db, "fetchone_dict", return_value={"total_bytes": 12345}):
        assert db.total_size_tables() == 12345  # noqa: PLR2004


# ---------------------------------------------------------------------------
# Busca por área (issue #206): q3c_radial_query e quadrado em ra/dec.
# ---------------------------------------------------------------------------


def _clusters_table():
    return Table(
        "clusters",
        MetaData(),
        Column("ra_deg", Float),
        Column("dec_deg", Float),
    )


def _sql(clause):
    return str(
        clause.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        ),
    )


def _area(method, ra, dec, radius):
    return {
        "method": method,
        "ra": ra,
        "dec": dec,
        "radius": radius,
        "ra_col": "ra_deg",
        "dec_col": "dec_deg",
    }


def test_area_q3c_uses_radial_query_with_quoted_columns():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("q3c", 10, -20, 0.5)))
    assert 'q3c_radial_query("ra_deg", "dec_deg", 10.0, -20.0, 0.5)' in sql


def test_area_q3c_rejects_unsafe_column_name():
    tbl = Table("t", MetaData(), Column("ra; drop", Float), Column("dec_deg", Float))
    area = {**_area("q3c", 10, -20, 0.5), "ra_col": "ra; drop"}
    with pytest.raises(ValueError, match="Unsafe SQL identifier"):
        _mydb().area_clause(tbl, area)


def test_area_rejects_unknown_column_and_method():
    db = _mydb()
    with pytest.raises(ValueError, match="not found"):
        db.area_clause(_clusters_table(), {**_area("box", 10, 0, 1), "ra_col": "x"})
    with pytest.raises(ValueError, match="Invalid area method"):
        db.area_clause(_clusters_table(), _area("polygon", 10, 0, 1))


def test_area_box_simple_between():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("box", 10, 0, 1)))
    assert "clusters.dec_deg BETWEEN -1.0 AND 1.0" in sql
    assert "clusters.ra_deg BETWEEN" in sql
    assert " OR " not in sql


def test_area_box_ra_width_grows_with_dec():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("box", 100, 59, 1)))
    match = re.search(r"ra_deg BETWEEN ([\d.]+) AND ([\d.]+)", sql)
    assert match is not None
    # Dec extremo do quadrado = 60 graus, cos(60) = 0.5 -> meia-largura de 2.
    assert float(match.group(1)) == pytest.approx(98.0)
    assert float(match.group(2)) == pytest.approx(102.0)


def _ra_or_bounds(sql):
    match = re.search(r"ra_deg >= ([\d.]+) OR clusters\.ra_deg <= ([\d.]+)", sql)
    assert match is not None, sql
    return float(match.group(1)), float(match.group(2))


def test_area_box_crosses_ra_zero():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("box", 0.5, 0, 1)))
    low, high = _ra_or_bounds(sql)
    # Meia-largura ~1 grau (1/cos(1 grau) no dec extremo do quadrado).
    assert low == pytest.approx(359.5, abs=1e-3)
    assert high == pytest.approx(1.5, abs=1e-3)


def test_area_box_crosses_ra_360():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("box", 359.5, 0, 1)))
    low, high = _ra_or_bounds(sql)
    assert low == pytest.approx(358.5, abs=1e-3)
    assert high == pytest.approx(0.5, abs=1e-3)


def test_area_box_touching_pole_has_no_ra_restriction():
    sql = _sql(_mydb().area_clause(_clusters_table(), _area("box", 10, -89.5, 1)))
    assert "dec_deg BETWEEN -90.0 AND -88.5" in sql
    assert "ra_deg" not in sql

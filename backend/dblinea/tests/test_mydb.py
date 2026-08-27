"""Regression test for MyDB.total_size_tables(): it used to raise
TypeError: 'NoneType' object is not subscriptable for any user whose mydb
schema exists but has no tables yet (fetchone_dict returns None when the
GROUP BY query matches zero rows, not a dict with a None total_bytes) -
found while testing issue #197's quota check against a schema with nothing
materialized in it yet.
"""

from unittest import mock

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

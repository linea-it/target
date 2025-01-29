from xmlrpc.client import Boolean

from sqlalchemy.sql import and_
from sqlalchemy.sql import select

from dblinea.dblinea import DBBase
from dblinea.queryset import Queryset


class Table:
    _db = None
    _tablename = None
    _schema = None
    _tbl = None

    columns = None

    def __init__(
        self,
        dbbase: DBBase,
        tablename: str,
        schema: str = None,
        debug: Boolean = False,
    ):
        if not isinstance(dbbase, DBBase):
            raise Exception("Necessário uma instancia da classe DBBase")

        self._db = dbbase
        self._db._setdebug(debug)

        self._tablename = str(tablename)

        if schema is not None:
            self._schema = str(schema)

        self._tbl = self._db.sa_table(self._tablename, self._schema)
        self.columns = self._tbl.c

    def head(self, n: int = 5):
        stm = select(self.columns).limit(n)

        return Queryset(self._db.fetchall_dict(stm))

    def query(
        self,
        columns: list,
        where=None,
        order_by=None,
        limit: int = None,
        offset: int = None,
    ):
        # TODO: Adicionar clausulas Where, Orderby

        stm = select(columns)
        if where is not None:
            stm = stm.where(and_(and_(*where)))

        stm = stm.order_by(order_by).limit(limit).offset(offset)

        return Queryset(self._db.fetchall(stm))

    def cone_search_stm(
        self,
        ra: float,
        dec: float,
        radius: float,
        ra_name="ra",
        dec_name="dec",
    ):
        return self._db._database.cone_search_stm(ra, dec, radius, ra_name, dec_name)

    def square_stm(
        self,
        lower_left: list,
        upper_right: list,
        ra_name="ra",
        dec_name="dec",
    ):
        return self._db._database.square_stm(lower_left, upper_right, ra_name, dec_name)

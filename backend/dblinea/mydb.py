from django.conf import settings
from sqlalchemy import desc
from sqlalchemy.sql import select
from sqlalchemy.sql import text
from sqlalchemy.sql.expression import literal_column

from dblinea import DBBase


class MyDB(DBBase):
    def __init__(self, username):
        db_settings = settings.DATABASES["mydb"]
        super().__init__(
            dbhost=db_settings["HOST"],
            dbname=db_settings["NAME"],
            dbuser=db_settings["USER"],
            dbpass=db_settings["PASSWORD"],
            dbport=3307,
            dbengine="postgresql_psycopg3",
            debug=True,
        )

        self.schema = self.get_user_schema_name(username)

    def get_user_schema_name(self, username):
        return f"{settings.USER_SCHEMA_PREFIX}{username}"

    def get_user_tables(self):
        return self.get_tables(schema=self.schema)

    def get_table_columns(self, tablename):
        return super().get_table_columns(schema=self.schema, tablename=tablename)

    def describe_table(self, tablename):
        return super().describe_table(schema=self.schema, tablename=tablename)

    def parse_ordering(self, ordering):
        if ordering[0] == "-":
            return ordering[1:], "desc"
        return ordering, "asc"

    def create_stm(
        self,
        tbl,
        columns=None,
        filters=None,
        ordering=None,
        limit=None,
        offset=None,
        url_filters=None,
    ):
        """
        Cria a SqlAlchemy Statement, este metdo pode ser sobrescrito para criar querys diferentes.
        mais sempre deve retornar um statement.
        :return: statement
        """
        # self.set_filters(filters)
        # self.set_query_columns(columns)
        # self.set_url_filters(url_filters)

        query_columns = tbl.c
        if columns and len(columns) > 0:
            query_columns = [tbl.c[col] for col in columns]

        stm = select(query_columns).select_from(tbl)

        # # Para esta query mais generica nao permitir filtros por condicoes especias "_meta_*"
        # filters = list()
        # for condition in self.filters:
        #     if condition.get("column").find("_meta_") == -1:
        #         filters.append(condition)

        # stm = stm.where(and_(*self.do_filter(self.table, filters)))

        # Ordenacao
        if ordering:
            column, direction = self.parse_ordering(ordering)
            if direction == "asc":
                stm = stm.order_by(text(column))
            else:
                stm = stm.order_by(desc(text(column)))

        # Paginacao
        if limit:
            stm = stm.limit(literal_column(str(limit)))

            if offset:
                stm = stm.offset(literal_column(str(offset)))

        return stm

    def query(
        self,
        tablename,
        columns=None,
        filters=None,
        ordering=None,
        limit=None,
        offset=None,
        url_filters=None,
    ):
        tbl = self.sa_table(schema=self.schema, tablename=tablename)

        # Cria o Statement para a query
        stm = self.create_stm(
            tbl=tbl,
            columns=columns,
            filters=filters,
            ordering=ordering,
            limit=limit,
            offset=offset,
            url_filters=url_filters,
        )

        print(stm)
        # executa o statement
        result = self.fetchall_dict(stm)

        # executa um metodo da DBbase para trazer o count sem levar em conta o limit e o start
        # count = self.stm_count(stm)

        count = 0
        return result, count

    def get_count(self, tablename):
        return super().get_count(tablename, schema=self.schema)

    def get_table_status(self, tablename):
        return super().get_table_status(tablename, schema=self.schema)

from django.conf import settings
from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy.sql import and_
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
            dbport=db_settings["PORT"],
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

    def create_total_count_stm(self, tbl, filters=None):
        """
        Cria o Statement para o count total de linhas da tabela.
        :param tbl: tabela
        :param filters: filtros
        :return: statement
        """
        values = None
        stm = select(func.count()).select_from(tbl)

        if filters:
            clauses, values = self.do_filter(tbl, filters)
            stm = stm.where(and_(*clauses))

        return stm, values

    def create_stm(
        self,
        tbl,
        columns=None,
        filters=None,
        ordering=None,
        limit=None,
        offset=None,
    ):
        """
        Cria a SqlAlchemy Statement, este metdo pode ser sobrescrito para criar querys diferentes.
        mais sempre deve retornar um statement.
        :return: statement
        """
        values = None

        query_columns = tbl.c
        if columns and len(columns) > 0:
            query_columns = [tbl.c[col] for col in columns]

        stm = select(query_columns).select_from(tbl)

        if len(filters) > 0:
            clauses, values = self.do_filter(tbl, filters)
            # print(clauses)
            # print(values)
            stm = stm.where(and_(*clauses))

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

        return stm, values

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

        if filters is None:
            filters = []

        if url_filters is not None:
            url_filters = self.parse_url_filters(tbl, url_filters)
            filters.extend(url_filters)

        print(filters)

        # Cria o Statement para a query
        stm, values = self.create_stm(
            tbl=tbl,
            columns=columns,
            filters=filters,
            ordering=ordering,
            limit=limit,
            offset=offset,
        )

        # print("Statement:", stm)
        # print("Values:", values)

        # Cria o Statement para o count total de linhas da tabela.
        stm_count, _ = self.create_total_count_stm(tbl, filters)

        # executa o statement
        rows = []
        count = 0
        with self.get_engine().connect() as con:
            # Run  total count statement
            self._debug_query(stm_count, with_parameters=False, values=values)
            count = con.execute(stm_count, values).scalar()

            # Run main query statement
            self._debug_query(stm, with_parameters=False, values=values)
            queryset = con.execute(stm, values)
            for row in queryset:
                rows.append(self.to_dict(row))

        print("=" * 40)
        return rows, count

    def get_count(self, tablename):
        return super().get_count(tablename, schema=self.schema)

    def get_table_status(self, tablename):
        return super().get_table_status(tablename, schema=self.schema)

    def parse_url_filters(self, tbl, url_filters):
        filters = []

        for filter_key, value in url_filters.items():
            # Separar field_name e operator
            if "__" in filter_key:
                field_name, operator = filter_key.rsplit("__", 1)
                operator = f"__{operator}"
            else:
                field_name = filter_key
                operator = "__eq"

            # Recupera a coluna sqlalchemy
            tbl_col = tbl.c.get(field_name)
            print(f"Column: {tbl_col}")

            print(f"Operator: {operator}")

            filters.append(
                {"column": tbl_col, "operator": operator, "value": value},
            )

        return filters

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

    def drop_user_table(self, tablename):
        """Remove uma tabela do schema do usuário.
        
        Args:
            tablename (str): Nome da tabela a ser removida.
        """
        super().drop_table(schema=self.schema, tablename=tablename)
        
# ---------------------------------------------

    def get_user_tables_detailed(self):
        """Retorna informações detalhadas sobre todas as tabelas do schema do usuário.
        
        Returns:
            list: Lista de dicionários com informações detalhadas de cada tabela
        """
        
        # Query para obter informações detalhadas das tabelas
        stm = text("""
            SELECT 
                n.nspname as table_schema,
                c.relname as table_name,
                'BASE TABLE' as table_type,
                COALESCE(pg_catalog.obj_description(c.oid, 'pg_class'), '') as description,
                CASE 
                    WHEN c.reltuples >= 0 THEN c.reltuples::bigint
                    ELSE 0 
                END as rows,
                pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
                pg_total_relation_size(c.oid) as total_bytes,
                pg_table_size(c.oid) as table_bytes,
                pg_indexes_size(c.oid) as index_bytes,
                CASE 
                    WHEN c.reltuples >= 0 THEN c.reltuples::bigint
                    ELSE 0 
                END as row_estimate,
                c.relpages as pages,
                c.relhasindex as has_indexes,
                c.relchecks as check_constraints,
                -- Verifica se tem chave primária
                EXISTS (SELECT 1 FROM pg_catalog.pg_index i WHERE i.indrelid = c.oid AND i.indisprimary) as has_primary_key,
                -- Conta constraints únicas (incluindo PK)
                (SELECT count(*) FROM pg_catalog.pg_constraint co WHERE co.conrelid = c.oid AND co.contype IN ('p', 'u')) as unique_constraints,
                -- Conta constraints de verificação
                (SELECT count(*) FROM pg_catalog.pg_constraint co WHERE co.conrelid = c.oid AND co.contype = 'c') as check_constraints_count,
                -- Conta foreign keys
                (SELECT count(*) FROM pg_catalog.pg_constraint co WHERE co.conrelid = c.oid AND co.contype = 'f') as foreign_keys,
                (SELECT count(*) 
                FROM pg_catalog.pg_attribute a 
                WHERE a.attrelid = c.oid 
                AND a.attnum > 0 
                AND NOT a.attisdropped) as column_count,
                pg_catalog.pg_stat_get_last_analyze_time(c.oid) as last_analyzed,
                pg_catalog.pg_stat_get_last_autoanalyze_time(c.oid) as last_autoanalyzed,
                pg_catalog.pg_stat_get_last_autovacuum_time(c.oid) as last_autovacuum,
                pg_catalog.pg_stat_get_last_vacuum_time(c.oid) as last_vacuum
            FROM pg_catalog.pg_class c
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = :schema
            AND c.relkind = 'r'
            ORDER BY pg_total_relation_size(c.oid) DESC;
        """)
        
        # Executa a query
        results = self.fetchall_dict(stm, {"schema": self.schema})
        
        # Processa os resultados para formatar as informações
        detailed_tables = []
        for table_info in results:
            detailed_table = {
                'schema': table_info['table_schema'],
                'table_name': table_info['table_name'],
                'table_type': table_info['table_type'],
                'description': table_info['description'] or None,

                'rows': table_info['rows'] or table_info['rows'] or 0,
                'row_estimate': table_info['rows'] or table_info['row_estimate'] or 0,
                'columns': table_info['column_count'] or 0,                    
                'total_bytes': table_info['total_bytes'] or 0,
                'table_bytes': table_info['table_bytes'] or 0,
                'index_bytes': table_info['index_bytes'] or 0,
                'pages': table_info['pages'] or 0,
                'has_indexes': table_info['has_indexes'],
                'has_primary_key': table_info['has_primary_key'],
                'check_constraints': table_info['check_constraints'],
                'unique_constraints': table_info['unique_constraints'],
                'check_constraints_count': table_info['check_constraints_count'],
                'foreign_keys': table_info['foreign_keys'],

                'last_analyzed': table_info['last_analyzed'],
                'last_autoanalyzed': table_info['last_autoanalyzed'],
                'last_vacuum': table_info['last_vacuum'],
                'last_autovacuum': table_info['last_autovacuum'],
            }
            detailed_tables.append(detailed_table)
        
        return detailed_tables
            

    def get_tables_without_stats(self):
        """Retorna tabelas que não possuem estatísticas atualizadas no schema do usuário.
        
        Returns:
            list: Lista de dicionários com informações das tabelas sem estatísticas atualizadas
            [{
                'schema_name': 'nome_do_schema',
                'table_name': 'nome_da_tabela',
                'estimated_rows': 0,
                'last_analyzed': None,
                'last_autoanalyzed': None
            }]
        """
        
        stm = text("""
                SELECT 
                    n.nspname as schema_name,
                    c.relname as table_name,
                    c.reltuples as estimated_rows,
                    pg_catalog.pg_stat_get_last_analyze_time(c.oid) as last_analyzed,
                    pg_catalog.pg_stat_get_last_autoanalyze_time(c.oid) as last_autoanalyzed
                FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = :schema
                AND c.relkind = 'r'
                AND (c.reltuples < 0 OR pg_catalog.pg_stat_get_last_analyze_time(c.oid) IS NULL)
                ORDER BY c.relname;
            """)
        
        # Executa a query
        results = self.fetchall_dict(stm, {"schema": self.schema})

        return results


    def analyze_tables_without_stats(self):
        """Executa o comando ANALYZE nas tabelas que não possuem estatísticas atualizadas no schema do usuário.
        
        Returns:
            list: Lista de nomes das tabelas que foram analisadas
        """
        
        tables_without_stats = self.get_tables_without_stats()
        analyzed_tables = []
        
        for table in tables_without_stats:
            table_name = table['table_name']
            self.analyze_table(self.schema, table_name)
            analyzed_tables.append(table_name)

        return analyzed_tables

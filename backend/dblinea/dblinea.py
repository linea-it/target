class TableNotFoundError(Exception):
    def __init__(self, tablename, schema):
        self.tablename = tablename
        self.schema = schema
        super().__init__(f"Table {tablename} not found in schema {schema}")


import re

import pandas as pd
import sqlalchemy
from sqlalchemy import MetaData
from sqlalchemy import Table
from sqlalchemy import func
from sqlalchemy import inspect
from sqlalchemy.sql import select
from sqlalchemy.sql import text

from dblinea.db_postgresql import DBPostgresql
from dblinea.operator_mapper import OperatorMapper


class DBBase:
    _database = None
    _engine = None
    _debug = False

    # TODO: OS dados de coneção com o banco devem vir de outro lugar!
    _available_databases = dict(
        {
            "gavo": {
                "ENGINE": "postgresql_psycopg2",
                "HOST": "desdb4.linea.gov.br",
                "PORT": "5432",
                "USER": "untrustedprod",
                "PASSWORD": "untrusted",
                "DATABASE": "prod_gavo",
            },
        },
    )

    def __init__(
        self,
        database="gavo",
        dbhost=None,
        dbname=None,
        dbuser=None,
        dbpass=None,
        dbport=None,
        dbengine="postgresql_psycopg2",
        debug: bool = False,
    ):
        self._debug = debug

        self.operator_mapper = OperatorMapper()

        # Se todas as variaveis de configuração forem None
        # Vai criar a conexão usando um dos _available_databases.
        # Default "gavo" ou o valor informado pelo usuario em database
        if all(x is None for x in [dbhost, dbname, dbuser, dbpass, dbport]):
            self.__set_database(database)
        else:
            # Se ao menos umas dessas variaveis
            # [dbhost, dbname, dbuser, dbpass, dbport]
            # For diferente de None, vai tentar criar uma conexão
            # usando os dados que o usuario passou.
            # Util para:
            # - Acessar outros bancos de dados que o usuario tenha acesso
            # - Conectar ao banco usando suas credenciais
            # - Para executar os Unit tests fora do ambiente.
            db_settings = {
                "ENGINE": dbengine,
                "HOST": dbhost,
                "PORT": dbport,
                "USER": dbuser,
                "PASSWORD": dbpass,
                "DATABASE": dbname,
            }

            self._database = DBPostgresql(db_settings)

    def _setdebug(self, debug: bool):
        self._debug = debug

    def __set_database(self, database):
        """Instancia a classe de Banco de dados.

        Este Metodo é utilizado quando é passado o
        parametro database na instancia da Classe.
        verifica se o database está na lista _available_databases

        Args:
            database (str): Nome do database como está no
            atributo _available_databases.

        Raises:
            ValueError: Database not available.
        """

        if database not in self._available_databases:
            raise ValueError("Database not available.")

        db_settings = self._available_databases[database]

        if db_settings["ENGINE"] == "postgresql_psycopg2":
            self._database = DBPostgresql(db_settings)

        # if db["ENGINE"] == "sqlite3":
        #     return DBSqlite(db)

        # if db_settings["ENGINE"] == "oracle":
        #     return DBOracle(db_settings)

    def available_databases(self):
        """Lista os bancos de dados disponiveis

        Returns:
            Lista de databases pre configurados na bibloteca.
            cada elemento da lista representa um db.

            exemplo:
            [{'config_name': 'gavo', 'dbname': '<database_name>',
            'host': '<database_host.linea.gov.br>', 'engine': 'postgresql_psycopg2'}]
        """

        dbs = []
        for config_name in self._available_databases:
            dbs.append(
                dict(
                    {
                        "config_name": config_name,
                        "dbname": self._available_databases[config_name]["DATABASE"],
                        "host": self._available_databases[config_name]["HOST"],
                        "engine": self._available_databases[config_name]["ENGINE"],
                    },
                ),
            )

        return dbs

    def get_engine(self):
        """Retorna uma sqlalchemy.Engine

        Cria ou retorna uma engine para o database solicitado na Instancia da DBBase.
        Mais informações sobre Engine em
        https://docs.sqlalchemy.org/en/14/core/connections.html#sqlalchemy.engine.Engine

        Returns:
            sqlalchemy.engine.Engine:
        """

        if self._engine is None:
            self._engine = self._database.get_engine()

        return self._engine

    def sa_table(self, tablename: str, schema: str = None) -> sqlalchemy.schema.Table:
        """Retona uma instancia de sqlalchemy.schema.Table que representa uma tabela no database.

        https://docs.sqlalchemy.org/en/14/core/metadata.html#sqlalchemy.schema.Table

        Args:
            tablename (str): Nome da tabela sem o schema.
            schema (str, optional): Schema onde a tabela se encontra. Defaults to None.

        Returns:
            raise TableNotFoundError(tablename, schema)
        """
        engine = self.get_engine()
        with engine.connect() as con:
            if engine.dialect.has_table(con, tablename, schema=schema):
                return Table(tablename, MetaData(schema=schema), autoload_with=engine)
            raise TableNotFoundError(tablename, schema)

    def table_exists(self, tablename: str, schema: str = None) -> bool:
        """Verifica se a tabela existe no schema informado.

        Args:
            tablename (str): Nome da tabela sem schema.
            schema (str, optional): Nome do schema. Defaults to None.

        Returns:
            bool: True se a tabela existir, False se não existir.
        """
        engine = self.get_engine()
        with engine.connect() as con:
            return engine.dialect.has_table(con, tablename, schema=schema)

    def get_tables(self, schema: str | None = None):
        """Retorna uma lista de tabelas no schema informado.

        Args:
            schema (str, optional): Nome do schema. Defaults to None.

        Returns:
            list: Lista de tabelas no schema.
        """
        engine = self.get_engine()
        with engine.connect() as con:
            insp = inspect(engine)
            return insp.get_table_names(schema=schema)

    def execute(self, stm, parameters=None):
        """Executa a query usando con.execute,
        recomendada para query de Delete, Update ou outras
        querys que não precisem de iteração com o resultado.

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            CursorResult: [description]
        """
        self._debug_query(stm)
        if isinstance(stm, str):
            stm = text(stm)

        with self.get_engine().connect() as con:
            if parameters:
                return con.execute(stm, parameters)
            return con.execute(stm)

    def fetchall(self, stm, parameters=None):
        """Executa a query e retorna todos os resultados em uma lista.

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            list: Lista com os resultado no formato original do SqlAlchemy LegacyRow.
        """
        # Convert Raw sql to Sql Alchemy TextClause
        stm = self.raw_sql_to_stm(stm)

        self._debug_query(stm)

        with self.get_engine().connect() as con:
            if parameters:
                queryset = con.execute(stm, parameters).fetchall()
            else:
                queryset = con.execute(stm).fetchall()
            return queryset

    def fetchall_dict(self, stm, parameters=None):
        """Executa a query e retorna todos os resultados em uma lista de Dicts.
            exemplo:[{'col': 'value', ..., 'colN':'valueN'}]

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            list: Resultado da query em uma lista de dicionários.
        """
        # Convert Raw sql to Sql Alchemy TextClause
        stm = self.raw_sql_to_stm(stm)

        self._debug_query(stm)

        with self.get_engine().connect() as con:
            if parameters:
                queryset = con.execute(stm, parameters)
            else:
                queryset = con.execute(stm)

            rows = []
            for row in queryset:
                rows.append(self.to_dict(row))

            return rows

    def fetchall_df(self, stm):
        """Executa a query usando Pandas e retorna um Dataframe com o resultado.

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
            ou string no caso de string ela sera convertida para TextClause.

        Returns:
            Pandas.Dataframe: Dataframe com o resultado da query.
        """
        self._debug_query(stm)

        df = pd.read_sql(stm, con=self.get_engine())

        return df

    def fetchone(self, stm, parameters=None):
        """Executa a query retorna a primeira linha do resultado

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            sqlalchemy.engine.row.LegacyRow: Primeira linha do resultado da query.
        """
        self._debug_query(stm)
        # Convert Raw sql to Sql Alchemy TextClause
        stm = self.raw_sql_to_stm(stm)

        with self.get_engine().connect() as con:
            if parameters:
                queryset = con.execute(stm, parameters).fetchone()
            else:
                queryset = con.execute(stm).fetchone()
            return queryset

    def fetchone_dict(self, stm, parameters=None):
        """Executa a query retorna a primeira linha do resultado convertida em Dict

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            dict: Primeira linha do resultado da query.
        """
        self._debug_query(stm)
        # Convert Raw sql to Sql Alchemy TextClause
        stm = self.raw_sql_to_stm(stm)

        with self.get_engine().connect() as con:
            if parameters:
                queryset = con.execute(stm, parameters).fetchone()
            else:
                queryset = con.execute(stm).fetchone()

            if queryset is not None:
                return self.to_dict(queryset)
            return None

    def fetch_scalar(self, stm, parameters=None):
        """Retorna o valor da primeira coluna na primeira linha do resultado da query
        util para querys de count por exemplo, ou quando se quer apenas um unico valor.

        Args:
            stm (statement): Query a ser executada, pode ser escrita em SqlAlchemy
                ou string no caso de string ela sera convertida para TextClause.
            parameters (dict, optional): Parâmetros para a query. Defaults to None.

        Returns:
            any: Valor da primeira coluna na primeira linha.
        """
        self._debug_query(stm)
        # Convert Raw sql to Sql Alchemy TextClause
        stm = self.raw_sql_to_stm(stm)

        with self.get_engine().connect() as con:
            if parameters:
                return con.execute(stm, parameters).scalar()
            return con.execute(stm).scalar()

    def to_dict(self, row):
        """Converte uma linha de resultado do SQLAlchemy queryset para Dict

        Args:
            row (sqlalchemy.engine.row.LegacyRow): Row retornada pelo execute.

        Returns:
            dict : Row convertida para Dict {colname: value, colname2: value2 ...}
        """
        return row._asdict()

    def raw_sql_to_stm(self, stm):
        """Converte uma string raw sql para SqlAlchemy TextClause

        Args:
            stm (str): Query SQL em string. ex: Select * from tablename...

        Returns:
            TextClause: TextClause representando uma string SQL.
        """
        if isinstance(stm, str):
            return text(stm)
        return stm

    def get_table_columns(self, tablename, schema=None):
        """Retorna os nomes das colunas de uma tabela.

        Args:
            tablename (string): Nome da tabela sem schema.
            schema (string): Nome do schema ou None quando nao houver.

        Returns:
            columns (list): Colunas disponiveis na tabela
        """
        insp = inspect(self.get_engine())
        return [value["name"] for value in insp.get_columns(tablename, schema)]

    def describe_table(self, tablename, schema=None):
        """Retorna uma lista de dicionarios com nome e
        tipo das colunas de uma tabela.
        exemplo: [{"name": "", "type": ""}]

        Args:
            tablename (str): Nome da tabela sem schema.
            schema (str, optional): Nome do schema. Defaults to None.

        Returns:
            list: Lista de colunas com seu tipo
        """

        cols = []

        insp = inspect(self.get_engine())
        for order, c in enumerate(insp.get_columns(tablename, schema)):
            cols.append(
                {
                    "name": c["name"],
                    "type": c["type"],
                    "python_type": c["type"].python_type,
                    "order": order,
                },
            )

        return cols

    def get_count(self, tablename, schema=None):
        with self.get_engine().connect() as con:
            tbl = self.sa_table(tablename, schema)
            stm = select(func.count()).select_from(tbl)

            self._debug_query(stm)

            return con.scalar(stm)

    def get_table_status(self, tablename, schema=None):
        """
        This will return size information for table, in both raw bytes and "pretty" form.

        Args:
            tablename (string): Nome da tabela sem schema.
            schema (string): Nome do schema ou None quando nao houver.

        Returns:
            status (Dict): {
                'oid': 16855,
                'table_schema': 'public',
                'table_name': 'test',
                'row_estimate': 0.0,
                'total_bytes': 425984,
                'index_bytes': 0,
                'toast_bytes': None,
                'table_bytes': 425984,
                'total': '416 kB',
                'index': '0 bytes',
                'toast': None,
                'table': '416 kB'
            }
        """
        and_schema = ""
        if schema != None:
            and_schema = "AND nspname = '%s'" % schema

        stm = text(
            str(
                "SELECT *, pg_size_pretty(total_bytes) AS total"
                " , pg_size_pretty(index_bytes) AS INDEX"
                " , pg_size_pretty(toast_bytes) AS toast"
                " , pg_size_pretty(table_bytes) AS TABLE"
                " FROM ("
                " SELECT *, total_bytes-index_bytes-COALESCE(toast_bytes,0) AS table_bytes FROM ("
                " SELECT c.oid,nspname AS table_schema, relname AS TABLE_NAME"
                " , c.reltuples AS row_estimate"
                " , pg_total_relation_size(c.oid) AS total_bytes"
                " , pg_indexes_size(c.oid) AS index_bytes"
                " , pg_total_relation_size(reltoastrelid) AS toast_bytes"
                " FROM pg_class c"
                " LEFT JOIN pg_namespace n ON n.oid = c.relnamespace"
                " WHERE relkind = 'r'"
                f" {and_schema} AND relname = '{tablename}'"
                " ) a"
                " ) a;",
            ),
        )

        return self.fetchone_dict(stm)

    def stm_to_str(self, stm, with_parameters=True):
        sql = str(
            stm.compile(
                dialect=self._database.get_dialect(),
                compile_kwargs={
                    "literal_binds": with_parameters,
                },
            ),
        )

        # Remove new lines
        sql = sql.replace("\n", " ").replace("\r", "")

        return sql

    def _debug_query(self, stm, with_parameters: bool = True, values=None):
        # https://docs.sqlalchemy.org/en/20/faq/sqlexpressions.html#rendering-bound-parameters-inline
        if not isinstance(stm, str):
            stm = self.stm_to_str(stm, with_parameters)

        if self._debug:
            if with_parameters is False and values is not None:
                print(str(stm) % values)
            else:
                print(stm)

    def get_column_obj(self, tbl, column_name):
        return getattr(tbl.c, column_name)

    def do_filter(self, table, filters):
        conditions = []
        all_values = {}

        for _filter in filters:
            field = _filter["column"]

            if isinstance(_filter["column"], str):
                # Recupera a coluna sqlalchemy
                field = self.get_column_obj(table, _filter["column"])

            condition, values = self.operator_mapper.apply_filter(
                field=field,
                operator=_filter["operator"],
                value=_filter["value"],
            )

            conditions.append(condition)
            all_values.update(values)

        return conditions, all_values

    def analyze_table(self, schema, tablename):
        """Executa o comando ANALYZE na tabela especificada.

        Args:
            schema (str): Nome do schema onde a tabela está localizada.
            tablename (str): Nome da tabela a ser analisada.

        Returns:
            None
        """
        analyze_stm = text(f'ANALYZE "{schema}"."{tablename}";')

        with self.get_engine().connect() as con:
            self._debug_query(analyze_stm)
            con.execute(analyze_stm)

    _SAFE_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

    def _assert_safe_identifier(self, name):
        """Garante que `name` é um identificador seguro para ser
        interpolado diretamente em SQL (schema/tabela/coluna).

        Usado em métodos que montam DDL/DML via string porque SqlAlchemy
        não parametriza identificadores (só valores). Os valores em si
        sempre devem ir como bind parameters, nunca por aqui.
        """
        if not isinstance(name, str) or not self._SAFE_IDENTIFIER_RE.match(name):
            msg = f"Unsafe SQL identifier: {name!r}"
            raise ValueError(msg)

    def add_columns(self, schema, tablename, columns):
        """Adiciona colunas em uma tabela existente via ALTER TABLE.

        Assume que os nomes de coluna são constantes internas (não input
        de usuário) e que schema/tablename já foram validados previamente
        (ex: table_exists). Não sobrescreve colunas já existentes: usa
        ADD COLUMN IF NOT EXISTS, então a checagem de colisão de nome deve
        ser feita pelo chamador antes de invocar este método.

        Args:
            schema (str): Nome do schema onde a tabela está localizada.
            tablename (str): Nome da tabela a ser alterada.
            columns (dict): {nome_da_coluna: tipo_sql} a adicionar.

        Returns:
            None
        """
        self._assert_safe_identifier(schema)
        self._assert_safe_identifier(tablename)
        for name in columns:
            self._assert_safe_identifier(name)

        clauses = ", ".join(
            f'ADD COLUMN IF NOT EXISTS "{name}" {sql_type}'
            for name, sql_type in columns.items()
        )
        stm = text(f'ALTER TABLE "{schema}"."{tablename}" {clauses};')

        with self.get_engine().begin() as con:
            self._debug_query(stm)
            con.execute(stm)

    def update_row(self, schema, tablename, id_column, id_value, values):
        """Atualiza uma única linha de uma tabela via UPDATE parametrizado.

        Nomes de coluna (id_column e chaves de values) devem ser constantes
        controladas pelo chamador, não input direto do usuário — apenas os
        valores (values, id_value) são passados como bind parameters.

        Args:
            schema (str): Nome do schema onde a tabela está localizada.
            tablename (str): Nome da tabela a ser atualizada.
            id_column (str): Nome da coluna usada para localizar a linha.
            id_value: Valor da coluna id_column que identifica a linha.
            values (dict): {nome_da_coluna: novo_valor} a atualizar.

        Returns:
            int: Número de linhas afetadas (0 ou 1).
        """
        self._assert_safe_identifier(schema)
        self._assert_safe_identifier(tablename)
        self._assert_safe_identifier(id_column)
        for name in values:
            self._assert_safe_identifier(name)

        set_clause = ", ".join(f'"{name}" = :set__{name}' for name in values)
        stm = text(
            f'UPDATE "{schema}"."{tablename}" SET {set_clause} '  # noqa: S608
            f'WHERE "{id_column}" = :id_value',
        )
        params = {f"set__{name}": value for name, value in values.items()}
        params["id_value"] = id_value

        with self.get_engine().begin() as con:
            self._debug_query(stm)
            result = con.execute(stm, params)
            return result.rowcount

    def drop_table(self, schema, tablename):
        """Remove a tabela especificada do banco de dados.

        Args:
            schema (str): Nome do schema onde a tabela está localizada.
            tablename (str): Nome da tabela a ser removida.

        Returns:
            None
        """

        tbl = self.sa_table(tablename, schema)
        tbl.drop(self.get_engine(), checkfirst=True)

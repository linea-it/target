import os

from dblinea import MyDB

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")


print("------------ Teste ------------ ")
db = MyDB(username="glauber_costa")

# print("List Tables in mydb schema")
# # tables = db.get_tables(schema="mydb_glauber_costa")
# tables = db.get_user_tables()
# print(tables)

# columns = db.get_table_columns(tablename="estrelas_brilhantes")
# print(columns)

# describe = db.describe_table(tablename="estrelas_brilhantes")
# print(describe)

# print("----------------------------")
# col = describe[1]
# print(col.get("type"))
# print(col.get("type").__repr__())

# print(col.get("python_type"))
# print(col.get("python_type").__name__)

rows, count = db.query(
    tablename="estrelas_brilhantes",
    # limit=5,
    # offset=8,
    url_filters={"coadd_object_id": "1063286835"},
    ordering="coadd_object_id",
)

# # print(len(rows))

# # print("--------------Count----------------")
# # count = db.get_count(tablename="estrelas_brilhantes")
# # print(count)

# # print("--------------Stats----------------")
# # stats = db.get_table_status(tablename="estrelas_brilhantes")
# # print(stats)

# # print("depois do import")
# # db = DBBase(
# #     database="prod_gavo",
# #     dbhost="host.docker.internal",
# #     dbname="prod_gavo",
# #     dbuser="user_dridev",
# #     dbpass="278e41447c72",
# #     dbport=3307,
# #     dbengine="postgresql_psycopg3",
# #     debug=True,
# # )
# # # print("instancia DBBase")
# # # print(db)

# # # print("Get table from mydb schema")
# # # tbl = db.sa_table(
# # #     schema="mydb_glauber_costa",
# # #     # tablename="mytable",
# # #     tablename="estrelas_brilhantes",
# # # )
# # # print(tbl)

# # # print("Get columns from mydb table")
# # # columns = db.get_table_columns(
# # #     schema="mydb_glauber_costa", tablename="estrelas_brilhantes"
# # # )
# # # print(columns)

# # # print("Describe table")
# # # columns = db.describe_table(
# # #     schema="mydb_glauber_costa", tablename="estrelas_brilhantes"
# # # )
# # # print(columns)


# # print("List Tables in mydb schema")
# # tables = db.get_tables(schema="mydb_glauber_costa")
# # print(tables)
# print("fim")

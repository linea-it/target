---
title: "Catálogos públicos (schema des_y6_gold) registráveis por admin"
status: "Fase 1 implementada"
date: 2026-08-25
implemented_date: 2026-08-25
author: glauber.vila.verde@gmail.com
phase: "Fase 1 de 2 (registro admin + leitura pública; TAP/filtro materializado fica para a Fase 2)"
issue: "#196"
---

# Fase 1 — Catálogos públicos (schema `des_y6_gold`) registráveis por admin no Canvas/Target

## Status da implementação (2026-08-25)

Fase 1 implementada e validada ponta a ponta (issue #196). Todas as decisões de arquitetura abaixo foram seguidas como planejado, com os seguintes detalhes/adições definidos durante a implementação:

- `CATALOG_SYSTEM_USERNAME = "catalog_system"` (constante em `catalog_admin.py`) — valor concreto do usuário de sistema citado na Decisão 1.
- **Adição não prevista no plano original**: `frontend/src/components/TargetDataGrid/index.js` agora omite as colunas "Quality" e "Comment" quando `catalog.is_public` é verdadeiro (e `RegisterCatalogConfirmation`/`Confirmation.js` passa `isPublic={catalog.is_public}` para cobrir o preview do wizard, que usa `RegisterCatalogContext` em vez do `CatalogContext` global). Motivo: essas colunas nunca existem fisicamente em tabelas de schema público (registro pula `ensure_annotation_columns`), então ficariam sempre vazias — pedido feito pelo usuário após a primeira rodada de implementação.
- **Correção incidental**: `backend/target/metadata/tests.py` tinha um import quebrado pré-existente (`_is_nullish` importado de `views.py`, mas definido em `notebook_utils.py`), que impedia toda a suíte de testes do backend de rodar. Corrigido apontando o import para `notebook_utils` diretamente (não foi criado um re-export em `views.py`, pois o ruff o marca como import não utilizado).
- **Limpeza incidental de lint**: `backend/dblinea/mydb.py` tinha débito de lint pré-existente (prints de debug, código comentado morto, linhas de SQL longas, `return`s redundantes) que bloqueava o `pre-commit` por o arquivo inteiro ser lintado quando qualquer parte dele é tocada — não só a mudança de `__init__`. Removido o que era código morto/debug; `create_stm`/`query` mantiveram a assinatura com muitos parâmetros (`# noqa: PLR0913`) para não alterar a API e todos os chamadores.
- `backfill_annotation_columns.py` ganhou um `continue` para pular tabelas de schemas públicos (evita tentar `ALTER TABLE` num schema externo compartilhado).
- **Follow-up (2026-08-26)**: dúvida do usuário sobre remoção de catálogo público (risco de `DROP TABLE`, acesso restrito a admin) levou à Decisão 10 (`can_manage`) — ver detalhes lá. Backend `perform_destroy` não mudou (já tinha o `is_staff` bypass); a lacuna era só de frontend (Settings inacessível para todo mundo em público).

### Verificação executada

- `pytest` no backend: 18 passed / 11 falhas — confirmado via `git stash` que essas 11 falhas já existiam antes desta implementação (URLs/namespace `users` não registrado em ambiente de teste), sem relação com a Fase 1.
- `pre-commit` limpo nos arquivos tocados (`ruff`, `ruff-format` e hooks genéricos).
- Fluxo completo validado no navegador (Playwright) com dados reais no `postgres-18` local (seed `compose/local/postgresql_18/seed_des_y6_gold.sql`):
  1. Usuário `is_staff=True` registrou `y6_cluster_wazp` (cluster) + `y6_cluster_members_wazp` (members) via wizard, com `AdminSchemaSelect` → `des_y6_gold` → `RegistrableSchemaTableSelect`, mapeando os UCDs obrigatórios.
  2. `Schema(name="des_y6_gold")` confirmado no Django admin com `is_public=True` e `owner=catalog_system`.
  3. Usuário não-staff, sem registrar nada, viu as 2 tabelas em `/catalogs` com chip "Public" na coluna Owner, navegou os dados normalmente (via `_get_reader_db`/`MyDB(schema=...)`), sem botão de Settings, sem `AnnotationPanel`, e sem as colunas Quality/Comment na grid.
  4. `AdminSchemaSelect` não aparece para esse usuário no wizard; `POST metadata/user_tables/` com `schema=des_y6_gold` retornou 403 (`PublicSchemaPermissionError`); tentativa de anotação de linha também retornou 403.
  5. `GET .../public_schemas/` e `.../registrable_schema_tables/` retornaram 403 para usuário não-admin (gate via `get_permissions`).

Fase 2 (TAP/filtro materializado) permanece não implementada, conforme escopo original.

## Contexto

Canvas/Target hoje só enxerga dados no schema pessoal `mydb_<username>` de cada usuário (mesmo Postgres de catálogo usado pelo Daiquiri/userquery, mesmo usuário de banco). Toda a stack — do formulário de registro até a leitura de linhas — está implicitamente amarrada a "o schema é sempre derivado do username logado".

Precisamos simular uma área comum a todos os usuários: hoje existe (ou vai existir localmente) um schema realmente público no banco de catálogo, `des_y6_gold`, com duas tabelas (`y6_cluster_wazp` e `y6_cluster_members_wazp`, um par cluster+members). Um admin deve poder registrar essas tabelas pela interface atual de registro de catálogo, marcá-las como públicas, e a partir daí **todo usuário autenticado** deve vê-las na listagem `/catalogs` e navegar os dados normalmente, sem precisar registrar nada.

Essa é a Fase 1 (registro admin + leitura pública). A Fase 2 (usuário filtra a tabela pública pela UI, dispara uma query via TAP do Daiquiri/userquery, resultado vira uma tabela nova no `mydb_<username>` do próprio usuário, sem exigir re-registro porque os UCDs já são conhecidos) **não é implementada agora**, mas as decisões de modelo de dados abaixo já deixam o caminho aberto para ela.

Decisões já validadas com o usuário:
- A lista de schemas/tabelas públicas "registráveis" fica em **um módulo Python versionado** (não settings/env var, não model+admin UI) — o usuário prefere editar código para adicionar novos schemas/tabelas no futuro.
- Apresentação na grid `/catalogs`: **reaproveitar a coluna "Owner"** existente mostrando um chip/texto "Public" em vez do username — sem agrupamento por schema nesta fase.

## Decisões de arquitetura

### 1. Modelo de dados — `Schema.is_public` + usuário de sistema como owner

`Schema.owner` continua **obrigatório** (não vira nullable). Em vez disso:
- `Schema.is_public = models.BooleanField(default=False)`.
- Quando uma tabela pública é registrada, `Schema.owner` aponta para um **usuário de sistema** fixo (`get_or_create` preguiçoso, não migration de dados), resolvido por uma função nova `get_catalog_system_user()`.
- `Table.source_table` — novo FK self, `null=True, blank=True, on_delete=SET_NULL, related_name="derived_tables"` — **não usado nesta fase**, mas reservado para a Fase 2 (apontar "esta tabela em mydb_<user> foi derivada desta tabela pública X"). Não confundir com `related_table` (que continua sendo exclusivamente o vínculo cluster→member).
- `Schema.Meta`: adicionar `unique_together = ("owner", "name")` (formaliza o que `get_or_create(owner=..., name=...)` já assume implicitamente hoje). Checar/dedupe antes de aplicar a constraint na migration se houver dados existentes duplicados.

Por que usuário de sistema em vez de owner nullable: evita blindar contra `None` todo código que hoje assume `schema.owner` existe sem checagem (`NestedTableSerializer.get_owner`/`get_is_owner`, `perform_destroy`, `annotation()`, `notebook_utils._prepare_cluster_notebook`, `backfill_annotation_columns`). Como bônus, `is_owner` (`obj.schema.owner.pk == current_user.pk`) automaticamente vira `False` pra todo mundo em tabelas públicas — nenhum usuário real, nem o admin que registrou, jamais é "dono" — o que já esconde sozinho o botão de Settings e evita o painel de anotação quebrado no frontend, sem lógica extra.

Arquivo: `backend/target/metadata/models.py`. Nova migration: `backend/target/metadata/migrations/0012_schema_is_public_table_source_table.py` (gerar via `makemigrations`).

### 2. Registro dos schemas/tabelas públicas "registráveis" — módulo Python

Novo arquivo `backend/target/metadata/public_catalogs.py`:

```python
# Schemas públicos do banco de catálogo (fora do mydb_<username> de qualquer
# usuário) cujas tabelas um admin pode registrar no Canvas. Para adicionar um
# novo schema/tabela público, editar este dicionário.
PUBLIC_CATALOGS = {
    "des_y6_gold": ["y6_cluster_wazp", "y6_cluster_members_wazp"],
}
```

Isso responde à necessidade de evolução ("hoje é só esse schema, mas a ideia é ter mais") sem exigir infra nova — é só editar esse dicionário e fazer deploy. A lista de tabelas por schema funciona como whitelist: o endpoint de descoberta (Decisão 4) cruza essa whitelist com a introspecção real do banco, então uma tabela listada aqui que não existe mais no Postgres simplesmente não aparece como registrável (sem erro), e nenhuma tabela fora da whitelist aparece mesmo que exista fisicamente no schema.

### 3. Camada de conexão (`dblinea`/`MyDB`) — schema explícito

`backend/dblinea/mydb.py`, mudança mínima e retrocompatível:

```python
def __init__(self, username=None, schema=None):
    ...  # conexão inalterada
    self.schema = schema if schema is not None else self.get_user_schema_name(username)
```

Todo chamador existente (`MyDB(username=...)`) continua idêntico. Novos chamadores usam `MyDB(schema="des_y6_gold")`. Como todos os outros métodos de `MyDB` já operam em cima de `self.schema`, nenhum outro método de `mydb.py` precisa mudar.

Em `backend/target/metadata/api/views.py` (`UserTableViewSet`), helper novo:

```python
def _get_reader_db(self, table):
    if table.schema.is_public:
        return MyDB(schema=table.schema.name)
    return MyDB(username=self.request.user.username)
```

Usar em `query_data()` e em `data()` (troca das linhas que hoje fazem `MyDB(username=self.request.user.username)` incondicionalmente). `_prepare_cluster_notebook`/`_prepare_catalog_notebook` chamam `query_data()` internamente, então o notebook de cluster e o QA notebook herdam a correção sem tocar em `notebook_utils.py`.

**Edição/anotação continua bloqueada em tabelas públicas — decisão explícita:**
- `_prepare_annotation_target`/`annotation()`: manter `MyDB(username=request.user.username)` e o check `table.schema.owner != request.user` (com owner = usuário de sistema, isso já barra todo mundo).
- `register_table`: pular `ensure_annotation_columns(db, ...)` quando a tabela é de um schema público (`if not is_public: ensure_annotation_columns(...)`) — não faz sentido `ALTER TABLE` num schema externo compartilhado para adicionar colunas de anotação pessoal.
- `data()`: pular `ensure_annotation_columns_lazy(db, table)` quando `table.schema.is_public`. `meta_quality_flag`/`meta_comment` simplesmente não existem nas linhas de tabelas públicas.
- `perform_destroy`: permitir que um admin também remova um catálogo público: `if instance.schema.owner != self.request.user and not self.request.user.is_staff: raise TableDeletePermissionError`.

### 4. Endpoints novos de descoberta (admin-only)

Em `UserTableViewSet` (`backend/target/metadata/api/views.py`):

```python
@action(detail=False, methods=["get"])
def public_schemas(self, request):
    return Response(sorted(PUBLIC_CATALOGS.keys()), status=status.HTTP_200_OK)

@action(detail=False, methods=["get"])
def registrable_schema_tables(self, request):
    schema = request.query_params.get("schema")
    allowed_tables = set(PUBLIC_CATALOGS.get(schema, []))
    if not allowed_tables:
        return Response({"error": "Unknown or unauthorized schema."}, status=status.HTTP_400_BAD_REQUEST)

    db = MyDB(schema=schema)
    live_tables = set(db.get_user_tables())
    results = [
        {"table": t, "schema": schema}
        for t in sorted(allowed_tables & live_tables)
        if not self.is_table_registered(t, schema)
    ]
    return Response(results, status=status.HTTP_200_OK)
```

Gate de admin via `get_permissions()`:

```python
def get_permissions(self):
    if self.action in ("public_schemas", "registrable_schema_tables"):
        return [permissions.IsAdminUser()]
    return super().get_permissions()
```

Endpoints: `GET metadata/user_tables/public_schemas/`, `GET metadata/user_tables/registrable_schema_tables/?schema=des_y6_gold`.

### 5. Gate de admin — `request.user.is_staff`

Já existe em `AbstractUser`, hoje sem uso no app — não há sistema de permissão custom. Usado em três camadas redundantes:
1. `get_permissions()` acima (bloqueia os 2 endpoints de descoberta a não-staff).
2. Helper central `backend/target/metadata/catalog_admin.py` (novo módulo, no padrão de `annotation.py`):

```python
class PublicSchemaPermissionError(PermissionError): ...

def get_catalog_system_user():
    user, _ = User.objects.get_or_create(
        username=CATALOG_SYSTEM_USERNAME,
        defaults={"is_active": False},
    )
    return user

def resolve_schema_owner(user, schema_name):
    if schema_name in PUBLIC_CATALOGS:
        if not user.is_staff:
            raise PublicSchemaPermissionError(
                f"Only admins can register tables from schema '{schema_name}'."
            )
        return get_catalog_system_user(), True
    return user, False
```

Chamado a partir de `register_table`/`register`/`create`/`update` — publicidade **nunca** é decidida pelo payload do cliente, só pela pertença de `data["schema"]` a `PUBLIC_CATALOGS` cruzada com `is_staff` do usuário autenticado no backend.

### 6. Registro (`register_table`, `register`, `create`, `update`)

Toda resolução de "quem é o dono da `Schema`" passa por `catalog_admin.resolve_schema_owner`:

- `register_table(self, user, data)`: `owner, is_public = resolve_schema_owner(user, data.get("schema"))`; `db = MyDB(schema=data["schema"]) if is_public else MyDB(username=user.username)`; `Schema.objects.get_or_create(owner=owner, name=data.get("schema"), defaults={"is_public": is_public})`; pular `ensure_annotation_columns` quando `is_public`.
- `register()` (fluxo cluster+member): os lookups de `related_table` (`Table.objects.get(name=table_name, schema__name=schema_name, schema__owner=user)`) precisam usar o owner resolvido em vez de `user` fixo, senão quebra para o member de um cluster público.
- `create()`/`update()`: mesma troca de `schema__owner=request.user` pelo owner resolvido nos dois lugares onde isso aparece hoje.
- `create()`: capturar `PublicSchemaPermissionError` antes do `except Exception` genérico e devolver 403 em vez de 500.

### 7. `list()` — visibilidade + self-healing multi-schema

`UserTableViewSet.list()`:
1. Filtro de visibilidade: `Q(schema__owner=self.request.user) | Q(schema__is_public=True)` (import `django.db.models.Q`) em vez de só `schema__owner=self.request.user`.
2. O bloco de self-healing (marcar como removida uma tabela que sumiu do banco) hoje assume que toda `table.name` do queryset pertence ao schema do próprio viewer. Corrigir agrupando por schema distinto presente no resultado:

```python
db = MyDB(username=request.user.username)
own_tables = set(db.get_user_tables())
public_schema_names = {t.schema.name for t in queryset if t.schema.is_public}
public_tables_by_schema = {
    name: set(MyDB(schema=name).get_user_tables()) for name in public_schema_names
}
def _exists_in_db(t):
    if t.schema.is_public:
        return t.name in public_tables_by_schema.get(t.schema.name, set())
    return t.name in own_tables
to_exclude = [t.name for t in queryset if not _exists_in_db(t)]
```

### 8. Apresentação — coluna "Owner" reaproveitada

- `NestedTableSerializer` (`backend/target/metadata/api/serializers.py`): `get_owner` retorna `"Public"` quando `obj.schema.is_public`, senão `obj.schema.owner.username` (comportamento atual). Adicionar `is_public = serializers.SerializerMethodField()` para o frontend estilizar sem parsear string.
- `frontend/src/components/CatalogDataGrid/index.js`: coluna `owner` ganha `renderCell` — `Chip` MUI "Public" quando `row.is_public`, texto normal caso contrário.
- `frontend/src/app/(authenticated)/catalog/[schema]/[table]/page.js` ("by {catalog.owner}") herda "Public" automaticamente via serializer, sem mudança de código.

### 9. Frontend — reaproveitamento do wizard `RegisterCatalog`

O wizard de 3 passos é reaproveitável quase 1:1. Mudanças:
- `backend/target/users/api/serializers.py`: `UserSerializer.Meta.fields` precisa incluir `"is_staff"` (hoje não exposto) — necessário para o frontend saber se deve mostrar o seletor de schema admin.
- Novo componente `frontend/src/components/RegistrableSchemaTableSelect/index.js` (variante de `UserTableSelect` que recebe um `schema` fixo e consome `registrableSchemaTables(schema)`).
- Novo componente `frontend/src/containers/RegisterCatalog/AdminSchemaSelect.js`: renderizado só se `user?.is_staff` (via `useAuth()`), `TextField select` alimentado por `publicSchemas()`; valor default vazio = fluxo atual inalterado (registrar do próprio mydb). Ao escolher um schema, `BasicInformation.js` troca `UserTableSelect`/`RelatedTableSelect` por `RegistrableSchemaTableSelect` com esse schema fixo.
- `frontend/src/containers/RegisterCatalog/BasicInformation.js`: decide condicionalmente qual componente de seleção renderizar; resto do wizard (`ColumnAssociation.js`, `Confirmation.js`) fica inalterado — já operam em cima de `catalog.schema`/`catalog.table` genéricos.
- `frontend/src/services/Metadata.js`: adicionar `publicSchemas()` → `GET metadata/user_tables/public_schemas/` e `registrableSchemaTables(schema)` → `GET metadata/user_tables/registrable_schema_tables/?schema=${schema}`.
- `complete_registration` no backend não muda (opera só via ORM).

**Ajuste extra necessário** (achado ao investigar o fluxo): `frontend/src/components/AnnotationPanel/index.js` é renderizado incondicionalmente hoje em `TargetDetail`/`ClusterDetail` (faz sentido porque hoje o usuário só vê as próprias tabelas). Para tabela pública, o backend devolve 403 em qualquer tentativa de salvar comentário/flag, e a UI hoje mostraria isso como erro em vez de simplesmente esconder o controle. Gatear a renderização do painel por `catalog.is_owner` (já disponível via `CatalogContext`) em `frontend/src/components/TargetDetail/index.js` e `frontend/src/components/ClusterDetail/index.js`.

### 10. Remoção de catálogos públicos — `can_manage` gateia o Settings, nunca `DROP TABLE`

Remover o registro de um catálogo (público ou privado) **nunca** dá `DROP TABLE` na tabela física — `perform_destroy` só apaga a linha de metadados via ORM (`instance.delete()` + `related_table.delete()`). O `DROP TABLE` de verdade só existe numa feature separada, "My Database" (`backend/target/mydb/api/views.py`, app `target.mydb`), hardcoded em `MyDB(username=request.user.username)` — não enxerga nem consegue tocar em schemas públicos, então esse risco não existe estruturalmente.

`perform_destroy` já checava `is_staff` como bypass de dono (Decisão 3), permitindo a um admin remover o registro de um catálogo público via API. Mas o frontend não deixava ninguém chegar nesse botão: a página inteira de Settings (onde mora "Remove Catalog", além de rename/descrição/remapeamento de UCD) é gateada por `catalog.is_owner`, que por desenho (Decisão 1) é sempre `False` em catálogos públicos — inclusive para o admin que registrou.

Solução — campo novo `NestedTableSerializer.get_can_manage`: `is_owner OR (is_public AND user.is_staff)`. `is_owner` continua intocado e segue controlando exclusivamente o `AnnotationPanel` (edição de Quality/Comment continua bloqueada em público para todo mundo — Decisão 3, não confundir com `can_manage`, que é sobre metadados do catálogo, não sobre linhas). `catalog.can_manage` substitui `catalog.is_owner` nos 3 pontos de gate do frontend:
- `frontend/src/containers/CatalogSettings/index.js` — acesso à página `/settings` inteira (rename, descrição, remapeamento de UCD, Danger Zone).
- `frontend/src/app/(authenticated)/catalog/[schema]/[table]/page.js` — visibilidade do ícone de Settings.
- `frontend/src/components/CatalogSettingsRemove/index.js` — habilita o botão "Remove Catalog" (antes comparava `user.username` com a string `"Public"`, que nunca batia com ninguém — o botão ficava sempre desabilitado, mesmo para admin).

Decisão explícita do usuário: admin tem acesso à página de Settings **inteira** em catálogos públicos (não só o Danger Zone) — trata o admin como dono efetivo para fins de edição de metadados do catálogo, mas não de anotação de linha (que segue tecnicamente impossível: `meta_quality_flag`/`meta_comment` nunca existem fisicamente em tabelas de schema público, já que `register_table` pula `ensure_annotation_columns` para elas).

Arquivo: `backend/target/metadata/api/serializers.py` (`NestedTableSerializer.get_can_manage`).

### 11. Ambiente local — schema `des_y6_gold` no `postgres-18`

Novo arquivo `compose/local/postgresql_18/seed_des_y6_gold.sql`, idempotente:

```sql
CREATE SCHEMA IF NOT EXISTS des_y6_gold;

CREATE TABLE IF NOT EXISTS des_y6_gold.y6_cluster_wazp (
    id_cluster   bigint PRIMARY KEY,   -- meta.id;meta.main
    ra           double precision,     -- pos.eq.ra;meta.main
    dec          double precision,     -- pos.eq.dec;meta.main
    redshift     double precision,
    richness     double precision
);

CREATE TABLE IF NOT EXISTS des_y6_gold.y6_cluster_members_wazp (
    id_member    bigint PRIMARY KEY,   -- meta.id;meta.main
    id_cluster   bigint,               -- meta.id.cross
    ra           double precision,     -- pos.eq.ra;meta.main
    dec          double precision,     -- pos.eq.dec;meta.main
    pmem         double precision
);

INSERT INTO des_y6_gold.y6_cluster_wazp VALUES
  (1, 10.5, -30.2, 0.35, 25.4),
  (2, 15.1, -28.9, 0.41, 18.2)
ON CONFLICT (id_cluster) DO NOTHING;

INSERT INTO des_y6_gold.y6_cluster_members_wazp VALUES
  (101, 1, 10.51, -30.19, 0.92),
  (102, 1, 10.48, -30.22, 0.87),
  (201, 2, 15.09, -28.88, 0.95)
ON CONFLICT (id_member) DO NOTHING;
```

Carga via `psql` manual, não via `docker-entrypoint-initdb.d`: os 3 dumps `.sql` que já existem nessa mesma pasta (`cluster_members.sql`, `galaxy_cluster.sql`, `lsst_dp1_sample.sql`) não estão referenciados pelo `Dockerfile` (que é só `FROM postgres:18.1-alpine`), confirmando que carga manual é o padrão real do projeto. Além disso `docker-entrypoint-initdb.d` só roda em volume vazio — `pg_data_18` já populado hoje não seria afetado sem `down -v` (destrutivo). Comando:

```
docker compose exec -T postgres-18 psql -U postgres -d canvas_catalogs \
  < compose/local/postgresql_18/seed_des_y6_gold.sql
```

## Passo a passo de verificação ponta a ponta

1. Rodar o `psql` acima para criar `des_y6_gold` + tabelas + dados de amostra.
2. Tornar um usuário existente staff (`is_staff=True`) via Django admin ou shell.
3. Logar no frontend como esse usuário staff → Register Catalog → `AdminSchemaSelect` aparece → escolher `des_y6_gold` → `RegistrableSchemaTableSelect` lista as 2 tabelas via `registrable_schema_tables`.
4. Registrar `y6_cluster_wazp` como `catalog_type=cluster`, escolher `y6_cluster_members_wazp` como related table.
5. Mapear UCDs em `ColumnAssociation.js`: cluster (`id_cluster→meta.id;meta.main`, `ra/dec→pos.eq.*;meta.main`), members (`id_cluster→meta.id.cross`, `id_member→meta.id;meta.main`, `ra/dec→pos.eq.*;meta.main`).
6. `complete_registration` finaliza; conferir no Django admin que `Schema(name="des_y6_gold").is_public=True` e `owner` é o usuário de sistema.
7. Logar como um **segundo usuário, não-staff**, sem nenhum papel especial: em `/catalogs` as 2 tabelas devem aparecer com "Public" na coluna Owner; clicar navega para `/catalog/des_y6_gold/y6_cluster_wazp`; dados carregam (via `data()` action usando `MyDB(schema="des_y6_gold")`); sem botão de Settings; sem painel de anotação quebrado (deve estar oculto).
8. Conferir que esse segundo usuário **não** vê `AdminSchemaSelect` no wizard de registro, e que uma tentativa direta de `POST metadata/user_tables/` com `schema=des_y6_gold` por esse usuário retorna 403.
9. Rodar `pytest`/suite de testes do backend existente (`backend/`) para garantir que nada quebrou no fluxo de registro/leitura de tabelas privadas (regressão).

## Arquivos críticos

- `backend/target/metadata/models.py` — `Schema.is_public`, `Schema.Meta.unique_together`, `Table.source_table`.
- `backend/target/metadata/migrations/0012_...py` — nova migration.
- `backend/target/metadata/public_catalogs.py` — novo, dicionário `PUBLIC_CATALOGS`.
- `backend/target/metadata/catalog_admin.py` — novo, `resolve_schema_owner`/`get_catalog_system_user`/`PublicSchemaPermissionError`.
- `backend/target/metadata/api/views.py` — `UserTableViewSet`: `_get_reader_db`, `public_schemas`, `registrable_schema_tables`, `get_permissions`, ajustes em `register_table`/`register`/`create`/`update`/`list`/`data`/`query_data`/`perform_destroy`.
- `backend/dblinea/mydb.py` — `MyDB.__init__` aceita `schema=` explícito.
- `backend/target/metadata/api/serializers.py` — `NestedTableSerializer.get_owner`/`get_is_public`/`get_can_manage`.
- `backend/target/users/api/serializers.py` — expor `is_staff`.
- `frontend/src/services/Metadata.js` — `publicSchemas`, `registrableSchemaTables`.
- `frontend/src/components/RegistrableSchemaTableSelect/index.js` — novo.
- `frontend/src/containers/RegisterCatalog/AdminSchemaSelect.js` — novo.
- `frontend/src/containers/RegisterCatalog/BasicInformation.js` — seleção condicional.
- `frontend/src/components/CatalogDataGrid/index.js` — chip "Public" na coluna Owner.
- `frontend/src/components/TargetDetail/index.js`, `frontend/src/components/ClusterDetail/index.js` — gatear `AnnotationPanel` por `catalog.is_owner`.
- `frontend/src/containers/CatalogSettings/index.js`, `frontend/src/components/CatalogSettingsRemove/index.js` — gatear acesso ao Settings e habilitar "Remove Catalog" por `catalog.can_manage` em vez de `catalog.is_owner` (Decisão 10).
- `frontend/src/components/TargetDataGrid/index.js`, `frontend/src/containers/RegisterCatalog/Confirmation.js` — omitir colunas "Quality"/"Comment" quando `isPublic`/`catalog.is_public` (adição pós-implementação, não estava no plano original).
- `compose/local/postgresql_18/seed_des_y6_gold.sql` — novo, seed local.
- `backend/target/metadata/tests.py` — corrige import pré-existente quebrado de `_is_nullish` (não fazia parte do escopo da feature, mas bloqueava a suíte de testes).
- `backend/target/metadata/management/commands/backfill_annotation_columns.py` — pula tabelas de schema público.

## Fase 2 (fora de escopo aqui, referência futura)

Usuário filtra uma tabela pública pela UI → requisição ao TAP service do Daiquiri/userquery → resultado materializado como nova tabela em `mydb_<username>` do próprio usuário. Como é um subset da tabela pública original, os UCDs já são conhecidos de antemão (herdados da tabela pública), então não deve exigir que o usuário refaça o mapeamento de colunas manualmente. O campo `Table.source_table` (introduzido na Decisão 1 desta fase, mas não usado ainda) é o ponto de extensão pensado para isso: ao materializar o subset, o registro automático da nova `Table` preencheria `source_table=<tabela pública original>` e copiaria os `Column.ucd` correspondentes, pulando o passo manual de `ColumnAssociation`.

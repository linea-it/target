---
title: "Filtro de tabela pública via TAP → nova tabela no mydb do usuário"
status: "Plano de implementação (spike concluído, código não iniciado)"
date: 2026-08-27
author: glauber.vila.verde@gmail.com
phase: "Fase 2 de 2 (segue a Fase 1, docs/public-catalog-schemas-plan.md)"
issue: "#197"
---

# Fase 2 — Filtro de tabela pública via TAP → nova tabela no `mydb_<username>` do usuário

## Contexto

A Fase 1 (issue #196, já implementada — ver `docs/public-catalog-schemas-plan.md`) deixou tabelas públicas de catálogo (ex.: `des_y6_gold.y6_cluster_wazp` + `y6_cluster_members_wazp`) navegáveis por qualquer usuário autenticado do Canvas, sem registro individual. Ela também deixou dois pontos de extensão propositalmente inertes para esta fase: o campo `Table.source_table` (FK self, reservado) e a convenção de que Canvas e Daiquiri compartilham o mesmo Postgres físico com a mesma nomenclatura de schema (`mydb_<username>`).

A issue #197 pede a Fase 2: o usuário filtra uma tabela pública pela UI já existente do Canvas (mecânica de filtro do MUI DataGrid) e materializa o resultado como uma tabela própria em `mydb_<username>`, via TAP service do Daiquiri/userquery — sem passar pelo wizard manual de registro, porque os UCDs já são conhecidos (herdados da tabela pública de origem).

A issue explicitamente pede um spike de investigação antes de detalhar tarefas. Esse spike foi feito antes deste plano, explorando os dois repositórios (`/home/glauber/linea/canvas` e `/home/glauber/linea/lsp_daiquiri`) e o comportamento real do Daiquiri (protocolo TAP/UWS, autenticação, dialetos de query suportados). Os achados e decisões abaixo substituem as perguntas em aberto da issue.

**Decisões já validadas com o usuário**:

1. **Edição de query**: estruturada apenas — o usuário edita filtros/colunas na UI de filtro já existente; a SQL resultante é mostrada só como preview read-only, nunca como texto livre editável. Elimina o risco de o usuário trocar a tabela-alvo da query.
2. **Auth serviço-a-serviço Canvas↔Daiquiri**: JWT HS256 com segredo simétrico compartilhado (env var nos dois `docker-compose`), mintado pelo Canvas por requisição, validado por uma nova authentication class DRF no Daiquiri. Pré-requisito: usuário já tem conta com o mesmo `username` nos dois sistemas (sem auto-provisionamento).
3. **Escopo de uma leva de código**: tabela simples e caso cluster+membros (2 tabelas) são entregues juntos na mesma etapa de orquestração/materialização — não split "simples vs. cluster" como eixo de corte. O corte em etapas é por **camada** (auth → client HTTP → geração de SQL → orquestração+registro → UI).

**Achado-chave que simplifica a implementação**: o Daiquiri deste ambiente já tem `postgresql` habilitado em `QUERY_LANGUAGES` (além de `adql`) — para `LANG=postgresql-*` a query não passa por tradução ADQL, só por parsing sintático (`queryparser`) para checagem de permissões. Isso permite montar SQL Postgres puro a partir do filtro da UI, sem implementar tradução para ADQL. O protocolo TAP assíncrono (`POST /tap/async` sem `PHASE=RUN`) já serve como validação sem execução "de graça" — não é preciso endpoint de validação novo no Daiquiri.

## Ordem de implementação (por camada, cada etapa é um PR isolado e testável sem depender da UI final)

```
0. Expor Table.source_table no serializer (Canvas)                     — aditivo, zero risco
1. Infra JWT serviço-a-serviço (Daiquiri + Canvas)                     — testável via curl
2. Client HTTP do Daiquiri no Canvas backend                           — testável via management command
3. Geração de SQL a partir do filterModel + endpoint de preview        — testável via testes unitários + curl
4. Model MaterializationJob + orquestração Celery + auto-registro      — endpoints REST, testável via curl/polling
5. Frontend: filtro → preview → confirmar → progresso → redirecionar
```

### Etapa 0 — `Table.source_table` visível

- `backend/target/metadata/api/serializers.py`: adicionar `source_table` (id) em `NestedTableSerializer`, somente leitura. O campo já existe no model desde a migration `0012_schema_is_public_table_source_table_and_more.py`; nenhuma migration nova aqui.

### Etapa 1 — JWT serviço-a-serviço

**Lado Daiquiri** (`/home/glauber/linea/lsp_daiquiri`):

- Criar `daiquiri/linea/authentication.py`: classe DRF `ServiceJWTAuthentication(BaseAuthentication)` que lê `Authorization: Bearer <jwt>`, valida HS256 contra `settings.CANVAS_SERVICE_JWT_SECRET` (audience `"daiquiri-tap"`), extrai claim `sub` e resolve `User.objects.get(username=sub, is_active=True)` — **nunca cria usuário**; se não existir, falha a autenticação (não gera 500, gera 401 via `exceptions.AuthenticationFailed`). Retornar `None` (não levantar exceção) quando não há header `Bearer`, para não quebrar `SessionAuthentication`/`TokenAuthentication`/SAML já em uso.
- Criar `daiquiri/linea/apps.py` (app `linea` ainda não tem `AppConfig` — seguir o padrão de `daiquiri/data/apps.py`/`daiquiri/utils/apps.py`/`daiquiri/services/apps.py`, que já existem). Em `ready()`, prepend `ServiceJWTAuthentication` na tupla `authentication_classes` de `daiquiri.jobs.viewsets.JobViewSet` (base comum de `/tap/sync` e `/tap/async`) e de `daiquiri.query.viewsets.QueryJobViewSet` (API REST `/query/api/jobs/`) — é monkeypatch aditivo porque não há hook de settings para trocar essas classes por dotted-path, e as urls importam os viewsets do pacote pip diretamente.
- Modificar `daiquiri/config/settings/base.py`: adicionar `"linea"` a `LINEA_APPS = ["djangosaml2", "services", "data", "utils"]` (linha 73 hoje — sem isso `ready()` nunca dispara); nova env var obrigatória `CANVAS_SERVICE_JWT_SECRET` (sem default, falha explícita se ausente).
- Adicionar `PyJWT` a `requirements/base.txt` se ainda não for dependência transitiva.
- Repassar `CANVAS_SERVICE_JWT_SECRET` no `docker-compose.yml`/`.env` do Daiquiri para o serviço `backend`.

**Lado Canvas** (`/home/glauber/linea/canvas/backend`):

- Criar função `mint_service_token(username)` (ex.: `backend/target/metadata/daiquiri_auth.py`): monta JWT HS256 com claims `sub=username`, `iat`, `exp` (TTL curto, ~5 min), `aud="daiquiri-tap"`, `iss="canvas"`, assinado com `settings.DAIQUIRI_SERVICE_JWT_SECRET`.
- `config/settings/base.py`: `DAIQUIRI_SERVICE_JWT_SECRET` (mesmo valor da env var do lado Daiquiri — nomes de variável podem diferir entre os dois `.env`, só o valor precisa ser idêntico) e `DAIQUIRI_BASE_URL`.
- Adicionar `PyJWT` a `pyproject.toml`.
- Repassar as duas env vars novas no `docker-compose.yml` do Canvas para `backend` e `celeryworker` (quem chama o Daiquiri de fato é a task Celery da Etapa 4).

**Critério de pronto**: `curl -H "Authorization: Bearer <jwt gerado por mint_service_token>" http://localhost:81/query/api/jobs/` retorna 200 para um username que existe em ambos os sistemas; sem header, comportamento idêntico ao atual (zero regressão em Session/Token/SAML).

**Riscos**: segredo simétrico vazado permite forjar qualquer identidade — mitigar com TTL curto e segredo só via env/secret manager; relógio dessincronizado entre containers pode invalidar `exp` (TTL de 5 min dá folga).

### Etapa 2 — Client HTTP do Daiquiri no Canvas

- Criar `backend/dblinea/daiquiri_client.py` (ao lado de `backend/dblinea/scienceserver.py`, que serve de modelo: dict de ambientes, wrappers `_get_request`/`_post_request` com tratamento uniforme de erro/timeout — aqui adaptado para `Authorization: Bearer {jwt}` em vez de `Token {token}`).
  - `DaiquiriTapClient(base_url, username)`: minta o token no `__init__` via `mint_service_token`.
  - `submit_async_job(query, table_name, lang="postgresql", maxrec=None) -> job_id`: `POST /tap/async` sem `PHASE=RUN` (validação).
  - `run_job(job_id)`: `POST /tap/async/<job_id>/phase` com `PHASE=RUN`.
  - `get_job_status(job_id) -> dict`: usar a API REST JSON `/query/api/jobs/<id>/` (não o XML UWS) — devolve `phase`/`error_summary`/etc de forma mais fácil de consumir.
  - `submit_and_run(...)`: atalho process+run.
  - Erros normalizados em `DaiquiriTapError(str)` com mensagem legível (não vazar estrutura DRF interna do Daiquiri).
- Testes com mock de `requests` (`backend/dblinea/tests/test_daiquiri_client.py` ou local de testes já convencionado): submissão OK, erro de validação, timeout, phase ERROR.
- `config/settings/base.py`: `DAIQUIRI_JOB_POLL_TIMEOUT_S`.

**Critério de pronto**: management command temporário roda submit→run→poll contra o Daiquiri local real (`localhost:81`) e imprime o resultado, sem nenhum código novo de model/Celery/UI do lado Canvas.

**Ponto de atenção**: o timeout relevante para queries longas é o da task Celery da Etapa 4 (que faz o loop de poll com sleep), não do client HTTP em si — cada chamada HTTP individual tem seu próprio timeout curto (`requests`).

### Etapa 3 — Geração de SQL a partir do `filterModel` + preview

- Criar `backend/target/metadata/filter_to_sql.py`: `build_select_sql(source_table, filter_model, *, extra_where_sql=None) -> str`.
  - Reaproveita a tabela de operadores de `backend/dblinea/operator_mapper.py` (mesmos nomes canônicos usados hoje pela grid), mas compila a cláusula para texto SQL com literais escapados via SQLAlchemy (`compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})`) em vez de bindparams executados.
  - **Segurança por construção**: nome de schema/tabela nunca vem do payload do usuário (vem sempre de `source_table.schema.name`/`source_table.name`, resolvidos a partir do `table_id` já autorizado); nome de coluna do filtro é validado contra `source_table.columns` (whitelist) antes de montar qualquer cláusula, rejeitando campo desconhecido com 400.
  - **Sempre `SELECT *`** (nunca lista de colunas) — garante que os nomes de coluna da tabela materializada batem 1:1 com a tabela de origem, o que a Etapa 4 depende para herdar UCD por nome sem ambiguidade.
  - `extra_where_sql`: usado só internamente pela Etapa 4 no caso membros (nunca vem de input do usuário).
- Novo endpoint `POST metadata/user_tables/{id}/filter_preview/` em `UserTableViewSet` (`backend/target/metadata/api/views.py`): input `{"filter_model": {...}}`, usa `get_object()` (herda a checagem de visibilidade já existente — próprias tabelas + públicas), retorna `{"sql": "..."}`. Nunca executa nada. Sem exigir `can_manage_table` (não é mutação).
- `frontend/src/services/Metadata.js`: `previewFilterSql({ tableId, filterModel })`.

**Critério de pronto**: SQL retornado roda manualmente via `psql` contra `canvas_catalogs` e bate com o resultado que `UserTableViewSet.data` já retorna filtrando os mesmos critérios via `OperatorMapper` (teste de paridade).

**Atenção**: `@mui/x-data-grid` (confirmado: versão free, `^8.9.1`, não `-pro`) só suporta `AND` entre itens do `filterModel` — `filter_to_sql` não precisa suportar `OR` nesta fase; documentar como limitação aceitável.

### Etapa 4 — Model de job + orquestração Celery + auto-registro

Camada mais densa. Segue o padrão já existente e testado em produção: `Table.catalog_diagnostic_status` + `backend/target/metadata/tasks.py::generate_catalog_diagnostic` (disparo via `transaction.on_commit(lambda: task.delay(...))`, status `PENDING/RUNNING/DONE/ERROR`, endpoint GET de status + endpoint POST de regenerate, tudo já rodando em Celery com Redis configurado neste projeto).

- **Novo model** `MaterializationJob` (`backend/target/metadata/models.py`, migration `0015_materializationjob.py` — próximo número livre após `0014_schema_unique_owner_name.py`): `owner` (FK User), `source_table` (FK Table), `filter_model` (JSONField, guardado para auditoria/retry), `result_table_name`, `related_result_table_name` (branco se não-cluster), `status`, `error`, `daiquiri_job_id_primary`/`_related`, `result_table` (FK Table nullable, preenchida ao concluir).
- **Nova task** `run_materialization_job(job_id)` em `backend/target/metadata/tasks.py`, `@shared_task(time_limit=900, soft_time_limit=840)` (maior que o default 300s/60s do projeto — aqui há potencialmente 2 `CREATE TABLE AS SELECT` sequenciais + polling):
  1. Checagem de quota preventiva (extrair `get_mydb_quota(username)` de `backend/target/mydb/api/views.py::MydbViewSet.get_quota`, hoje método de instância, para função livre reutilizável).
  2. Monta SQL via `filter_to_sql.build_select_sql`.
  3. `DaiquiriTapClient(base_url, job.owner.username).submit_and_run(sql, result_table_name)`, poll até `COMPLETED`/`ERROR`/`ABORTED`.
  4. Se `source_table.catalog_type == cluster` e tem `related_table`: monta segunda query com `extra_where_sql` referenciando a tabela recém-criada (`WHERE m.id_cluster IN (SELECT id_cluster FROM mydb_<user>.<t1>)`) — **sequencial, não paralelo**, pois depende do resultado físico do job 1. Submete e faz poll do job 2.
  5. Checagem de quota **pós**-materialização (a checagem prévia é preventiva, não atômica — TOCTOU real, já que quem executa o `CREATE TABLE` é o Daiquiri, fora do controle transacional do Canvas). Se estourou, `DROP TABLE` via `MyDB(username=...).drop_user_table(...)` e `ERROR`.
  6. Se job 2 falhar após job 1 ter sucesso: `DROP TABLE` de `t1` (rollback físico explícito — não há transação distribuída entre os dois serviços) e `status=ERROR` com mensagem indicando a etapa.
  7. Sucesso: chama a nova função de auto-registro (abaixo), seta `result_table`, `status=DONE`.
- **Refatoração de suporte**: extrair `register_table`/`register`/`is_table_registered` de métodos de instância de `UserTableViewSet` para funções livres (ex.: em `backend/target/metadata/catalog_admin.py`, que já concentra regras de registro/permissão) — hoje não usam `self`/`self.request` de verdade, só precisam virar chamáveis fora do contexto HTTP para a task Celery reusar. `create()`/`update()` existentes viram wrappers finos, sem regressão.
- **Nova função** `register_derived_table(owner, source_table, result_schema_name, result_table_name, title)`: chama `register_table` para stats/colunas básicas, depois sobrescreve `ucd`/`unit`/`description` de cada `Column` cujo nome bate com uma coluna de `source_table` (herança por nome, garantida pelo `SELECT *` da Etapa 3), seta `table.source_table = source_table`, valida UCDs obrigatórias (reaproveitar `REQUIRED_UCDS`/`RELATED_REQUIRED_UCDS`) antes de marcar `is_completed=True` — **nunca** marcar completo sem as UCDs mínimas, mesmo que isso signifique falhar o job. Para cluster+membros, chama duas vezes e liga `table1.related_table = table2`.
- **Endpoints REST novos** em `UserTableViewSet`:
  - `POST metadata/user_tables/{id}/materialize/`: `{"filter_model": {...}}`; `{id}` é sempre a tabela pública de origem. Nome de tabela resultante **sempre auto-gerado** pelo Canvas (`f"{source_table.name}_subset_{timestamp}"`), não exposto como campo livre ao usuário (evita colisão/nome inválido). Rejeita com 400/429 se já existe `MaterializationJob` do mesmo `owner`+`source_table` em `PENDING`/`RUNNING` (evita duas materializações concorrentes da mesma origem). Cria o job, `transaction.on_commit(...delay...)`, retorna 202.
  - Nova viewset somente-leitura `MaterializationJobViewSet` (`config/api_router.py`, registrada como `metadata/materialization_jobs`), filtrada sempre por `owner=request.user` (nunca staff vendo job de outro usuário — aqui não existe conceito de schema público). `GET metadata/materialization_jobs/{id}/` retorna status/erro/`result_table`.

**Critério de pronto**: `POST .../materialize/` → 202 → polling em `GET .../materialization_jobs/{id}/` chega a `status: done` com `result_table` apontando para uma `Table` nova, visível em `GET metadata/user_tables/` do próprio usuário, com `source_table` preenchido e UCDs herdadas — sem qualquer chamada ao wizard `ColumnAssociation`.

### Etapa 5 — Frontend

- `frontend/src/components/TargetDataGrid/index.js`: capturar o `filterModel` atual via `apiRef.current.subscribeEvent('filterModelChange', ...)` (mesmo padrão já usado nesse arquivo para `cellFocusIn`) — **não** tornar o grid controlado, para não arriscar regressão no `dataSource` existente. Guardar em `frontend/src/contexts/CatalogContext.js` (novo campo `lastFilterModel`, ao lado dos campos já existentes).
- `frontend/src/containers/CatalogDetail/index.js`: botão "Save filtered subset", visível só quando `catalog.is_public === true`.
- Novo mini-wizard `frontend/src/containers/MaterializeCatalog/` (espelha a estrutura de `RegisterCatalog/`: `Stepper.js`, `SqlPreview.js` — chama `previewFilterSql`, mostra `<pre>` **read-only**, nunca textarea editável —, `Confirmation.js`, `Progress.js`) + `frontend/src/contexts/MaterializeCatalogContext.js`.
- `Progress.js` replica exatamente o padrão de `frontend/src/components/CatalogDiagnostic/index.js`: `useQuery` com `refetchInterval` condicional (`pending`/`running` → 5000ms, senão `false`) batendo em `getMaterializationJob`; ao concluir, redireciona para a nova tabela.
- `frontend/src/services/Metadata.js`: `materializeTable`, `getMaterializationJob`.

**Critério de pronto (E2E manual)**: abrir `des_y6_gold.y6_cluster_wazp` em `/catalogs`, aplicar filtro no grid nativo, "Save filtered subset" → SQL preview correto → confirmar → progresso com polling → redirecionamento para a tabela nova (e, no caso cluster, também a de membros), já navegável com UCDs corretas.

## Arquivos críticos

**lsp_daiquiri**: `daiquiri/linea/authentication.py` (novo), `daiquiri/linea/apps.py` (novo), `daiquiri/config/settings/base.py` (`LINEA_APPS`, novo secret).

**canvas/backend**: `backend/dblinea/daiquiri_client.py` (novo), `backend/target/metadata/daiquiri_auth.py` (novo), `backend/target/metadata/filter_to_sql.py` (novo), `backend/target/metadata/models.py` (`MaterializationJob`), `backend/target/metadata/tasks.py` (`run_materialization_job`, ao lado de `generate_catalog_diagnostic`), `backend/target/metadata/api/views.py` (`UserTableViewSet.filter_preview`/`materialize`, `MaterializationJobViewSet`), `backend/target/metadata/api/serializers.py`, `backend/target/metadata/catalog_admin.py` (funções de registro/UCD extraídas), `backend/target/mydb/api/views.py` (`get_mydb_quota` extraída), `backend/config/api_router.py`, `backend/dblinea/operator_mapper.py` (referência, não modificado).

**canvas/frontend**: `frontend/src/components/TargetDataGrid/index.js`, `frontend/src/contexts/CatalogContext.js`, `frontend/src/containers/CatalogDetail/index.js`, `frontend/src/containers/MaterializeCatalog/*` (novo), `frontend/src/components/CatalogDiagnostic/index.js` (padrão de polling replicado), `frontend/src/services/Metadata.js`.

## Verificação end-to-end

1. Etapas 1-2: `curl` direto no tap_service do Daiquiri local (`localhost:81`) com JWT mintado manualmente; management command temporário no Canvas fazendo submit→run→poll.
2. Etapa 3: `curl` no `filter_preview/`, rodar o SQL retornado via `psql` contra `canvas_catalogs`, comparar com resultado da grid filtrada normalmente (paridade `OperatorMapper` vs. `filter_to_sql`).
3. Etapa 4: `curl` no `materialize/` + polling no `materialization_jobs/{id}/`; conferir no Django admin/`psql` que a tabela foi criada em `mydb_<username>`, que `Table.source_table` aponta certo e que `Column.ucd` bate com a tabela de origem; testar o caminho de falha do job 2 (ex. forçar erro) e confirmar rollback (`DROP TABLE` de `t1`).
4. Etapa 5: fluxo completo no browser (Playwright, `localhost:80`) com o seed de dados de `des_y6_gold` já usado na Fase 1 — filtrar `y6_cluster_wazp`, materializar, confirmar que cluster+membros aparecem em `/catalogs` como tabelas próprias navegáveis.
5. Regressão: `pytest` no backend do Canvas (suíte já existente) para garantir que a extração de `register_table`/`register`/UCDs para funções livres não quebrou o fluxo de registro manual (wizard `RegisterCatalog`) nem o de catálogos públicos da Fase 1.

## Riscos e decisões em aberto para revisão futura

- **Segredo JWT simétrico (HS256)**: decisão desta etapa por simplicidade; se o ambiente evoluir para múltiplos serviços consumidores do TAP do Daiquiri, considerar migrar para RS256 (par de chaves assimétrico, Daiquiri só guarda a chave pública).
- **Reconciliação de jobs "esquecidos"**: se a task Celery cair no meio do polling (ex. worker reiniciado), o job fica em `RUNNING` sem trigger de retomada automática nesta primeira versão — não há `celery beat` de reconciliação. Usuário precisaria disparar nova materialização. Candidato a follow-up.
- **Quota TOCTOU**: a checagem de quota do Canvas é preventiva e pós-hoc, não atômica com o `CREATE TABLE` do Daiquiri (que roda fora do controle transacional do Canvas). Documentado como limitação conhecida, mitigada por checagem dupla (antes e depois) com rollback em caso de estouro.
- **Nome de tabela auto-gerado**: decisão desta etapa (evita colisão/validação de nome livre do usuário). Se o usuário quiser nomear a tabela resultante, isso é um follow-up de UX, não uma mudança de arquitetura.

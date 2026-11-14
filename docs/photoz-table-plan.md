---
title: "Photo-z por tabela no Aladin do Cluster Detail"
status: "Implementado; aguardando tabela real de photo-z"
date: 2026-11-14
---

# Photo-z por tabela no Aladin do Cluster Detail

## Contexto

O catálogo de photo-z do Aladin do Cluster Detail vinha de um HiPS fixo no
código (`docs/photoz-hips-catalog-plan.md`). Assim como os clusters vizinhos
(`docs/neighbor-clusters-plan.md`), ele passa a vir de uma tabela no banco:
uma busca por área ao redor do cluster exibido, na tabela de photo-z
escolhida pelo usuário, filtrada pelo intervalo de z.

## Tabelas de photo-z

- Novo `Table.catalog_type = "photoz"`, registrado pelo fluxo normal:
  - usuário, em `mydb_<user>`;
  - admin, em schema público; a tabela precisa estar em `PUBLIC_CATALOGS`.
- Com clusters habilitados (`enable_cluster`), o registro mostra o select de
  tipo (Cluster / Photo-z).
- UCDs obrigatórias: id, ra, dec e **`src.redshift.phot`** (coluna de z).
  Definidas em `Table.PHOTOZ_REQUIRED_UCDS` / `Table.required_ucds_for` e em
  `frontend/src/data/ucds.js`.
- A tabela aparece na lista de catálogos e é exibida como uma lista de
  targets.

## Backend

- `GET metadata/user_tables/photoz_tables/` lista as tabelas photo-z
  completas que o usuário pode ler (próprias e públicas). Cada item traz
  `{id, title, schema, table, is_public, z_column}`.
- O endpoint `data/` devolve `meta_z` (valor da coluna com a UCD de z).
- A busca reaproveita a busca por área (`cone_*`, método `box`) e os filtros
  de intervalo já existentes (`<z_column>__gte` / `<z_column>__lte`).
- `Settings.photoz_hips` virou `Settings.photoz`, com a forma
  `{tableId, factor, maxRadiusDeg, shape, sourceSize, colormap, zMin, zMax,
  showOnOpen}`. A migration 0020 zera os valores antigos.

## Frontend

- `components/Aladin/photoz.js`: defaults, limites do slider de z
  (`PHOTOZ_Z_BOUNDS = [0, 2]`, porque a tabela não informa min/max) e o
  limite de 5000 fontes por busca.
- `components/Aladin/usePhotoz.js`: lista de tabelas, query das fontes e
  desenho.
  - Raio da busca = raio do cluster × fator, com teto de 1°, mesma regra dos
    vizinhos.
  - Trocar de cluster, tabela, raio ou intervalo de z refaz a busca.
  - Shape, tamanho e colormap só redesenham.
- `useAladin`: `setPhotozSources`, `setPhotozVisibility` e
  `removePhotozSources`.
  - Catálogo comum com a shape de canvas colorida por `meta_z`.
  - O clique abre o `showTable` do Aladin.
- `PhotozCatalogDialog` tem:
  - tabela, fator, raio máximo, shape, tamanho, colormap e intervalo de z com
    colorbar;
  - contagem e tempo da busca, com aviso quando o resultado é truncado.
- `PhotozSettingsCard`: os defaults nos Settings do catálogo de clusters,
  incluindo "Show on open".
- Removidos `hipsCatalogs.js`, `useHipsCatalogDefaults.js` e
  `PhotozHipsSettingsCard.js`.

## Pendências

- Testar com a tabela real de photo-z quando ela existir:
  - densidade e limite de 5000;
  - limites do slider de z;
  - índice espacial em ra/dec para o `box`.

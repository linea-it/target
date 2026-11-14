---
title: "Clusters vizinhos no Aladin do Cluster Detail (busca por área na tabela)"
status: "Implementado; box no frontend, q3c oculto"
date: 2026-11-14
issue: https://github.com/linea-it/target/issues/206
---

# Clusters vizinhos no Aladin do Cluster Detail

## Contexto

O overlay de clusters via catálogo HiPS de céu inteiro (fac81dc) não performou
bem. Ele foi substituído por uma busca por área na própria tabela de clusters:
ao exibir um cluster (no preview do catálogo e em `cluster_detail/[id]`), o botão
"Neighbor clusters" (`BubbleChartIcon`) mostra os clusters da mesma tabela ao
redor dele.

- Centro: ra/dec do cluster exibido.
- Raio de busca: raio do cluster (`meta_radius_arcmin`, UCD `phys.angSize;src`;
  fallback `default_marker_size`, depois 5″) × fator, limitado ao raio máximo
  (≤ 1°, teto também no backend).
- Cada vizinho é um círculo com o seu raio. O clique usa o comportamento padrão
  do Aladin (`showTable`): mostra os dados da linha. O próprio cluster é
  excluído da lista.

## Backend

- `GET metadata/user_tables/{id}/data/` aceita `cone_ra`, `cone_dec` e
  `cone_radius` (graus, os três juntos) e `cone_method` (`box` default | `q3c`).
  - `UserTableViewSet.parse_cone` valida os valores e devolve 400 se forem
    inválidos.
  - O raio é limitado a `MAX_CONE_RADIUS_DEG = 1.0`.
  - ra/dec vêm das UCDs `pos.eq.ra/dec;meta.main`.
- `MyDB.query(..., area=...)` → `MyDB.area_clause`, aplicada à query e ao count:
  - `q3c`: `q3c_radial_query("ra", "dec", :ra, :dec, :radius)`, que usa o índice
    espacial. Sem a extensão q3c no banco, o endpoint responde 501 com mensagem
    clara.
  - `box`: só `BETWEEN`/`OR`, sem função especial. A meia-largura em RA é
    r / cos(|dec| máximo do quadrado). O cruzamento de RA = 0/360 é tratado com
    `OR`. Se o quadrado toca um polo, não há restrição de RA. O quadrado
    devolve também os cantos fora do círculo.
- `Settings.cluster_hips` virou `Settings.neighbor_clusters`
  (`{factor, maxRadiusDeg, method, color, opacity, lineWidth, showOnOpen}`).
  A migration 0019 zera os valores antigos, que eram incompatíveis.

## Frontend

- `components/Aladin/neighborClusters.js`: defaults, métodos e cálculo do raio.
- `components/Aladin/useNeighborClusters.js`: estado, query (react-query) e
  desenho.
- `useAladin`: `setNeighborClusters`, `setNeighborClustersVisibility` e
  `removeNeighborClusters`. Usa `A.catalog` com shape de footprint `A.circle` e
  `onClick: 'showTable'`.
- `NeighborClustersDialog`: fator (1–50×), raio máximo, estilo, contagem e tempo
  da requisição, aviso de resultado truncado (> 1000).
- `NeighborClustersSettingsCard`: os defaults nos Settings do catálogo.

## Pendências

- O frontend usa só `box`; a seleção de método foi ocultada. O `q3c` continua
  no backend: para reativar, voltar a opção em `NEIGHBOR_METHODS`
  (`neighborClusters.js`) e o select no dialog e no card de Settings.
- Validar o desenho e o clique com um catálogo real denso (o banco local só
  tem catálogos esparsos).

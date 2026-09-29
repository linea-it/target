---
title: "Catálogo HiPS de clusters (céu inteiro) no Aladin do Cluster Detail"
status: "Implementado (controle de catálogo); ação de clique pendente"
date: 2026-09-29
author: glauber.vila.verde@gmail.com
---

# Catálogo HiPS de clusters (céu inteiro) no Aladin do Cluster Detail

## Contexto

Na tela de catálogo de clusters (lista à esquerda + Aladin à direita) e na página
`cluster_detail/[id]`, o raio do cluster selecionado é desenhado a partir do registro
do banco (`setTarget` → `A.circle`). Foi pedido um catálogo HiPS de céu inteiro com
todos os clusters, carregado igual a DES/DP1/DP2 (`A.catalogHiPS`), com controle próprio:
botão na toolbar do Aladin que abre um popup para escolher o catálogo, a cor, a
opacidade e a espessura da linha. Cada cluster é desenhado como um círculo com o seu
raio real (lido de uma coluna do HiPS), escalando com o zoom.

## Implementado

- `frontend/src/components/Aladin/useAladin.js`
  - Lista `clusterCatalogs` (separada de `catalogs`; não é pré-carregada nem aparece no
    CatalogControls genérico). Campos: `id`, `name`, `url`, `radiusColumn`, `radiusUnit`
    (`deg` | `arcmin` | `arcsec`), `defaultRadiusArcmin`, `options`, `requireGroup` opcional.
    Catálogos sem `url` não são listados.
  - `makeClusterRadiusShape(cfg, style)`: shape function de 1 argumento que retorna
    `A.circle(ra, dec, raio)`; o Aladin trata como footprint e cai no marker padrão
    quando o círculo fica pequeno demais na tela.
  - Métodos `getClusterCatalogs`, `setClusterCatalog`, `setClusterCatalogVisibility`,
    `removeClusterCatalog` e estado `clusterOverlay` (`{ catalogId, color, opacity, lineWidth, visible }`).
  - Mudança de estilo recria o catálogo (footprints ficam em cache por tile, `updateShape`
    não os recalcula).
- `frontend/src/components/Aladin/ClusterCatalogDialog/index.js`: popup (catálogo, cor,
  opacidade, espessura, Show/Hide, Remove).
- Botão "Clusters catalog" (`BubbleChartIcon`) em `components/ClusterDetail/index.js` e
  `containers/ClusterDetail/index.js`.

### Bugs encontrados e corrigidos durante a implementação

- **Estado do popup zerado a cada re-render da página**: `aladinParams` é passado como
  objeto inline em `page.js`, então o cleanup do effect de init do `useAladin` rodava a
  cada re-render do pai e zerava `clusterOverlay`/`mapOverlays`, embora o Aladin não seja
  recriado. O reset foi movido para o ponto em que uma nova instância do Aladin é criada.
  Corrige também o mesmo bug latente do botão de Mapas.
- **`ProgressiveCat` (catálogo HiPS) não tem `removeAll()`**: a chamada lançava
  `TypeError` e impedia recriar o catálogo com o novo estilo (cor/opacidade/espessura
  "não mudavam") e o Remove. Agora a remoção usa apenas `aladin.removeOverlay()`.

## Pendências

### 1. Ação ao clicar no círculo do cluster (link para o detalhe)

Objetivo: ao clicar no círculo, abrir o popup do Aladin com o id do cluster como link
para a página de detalhe do cluster, em nova aba.

Viabilidade técnica (verificada no bundle aladin-lite 3.7.0-beta): `onClick` do catálogo
aceita uma função, chamada com a fonte clicada (`source.data` tem as colunas do HiPS), e
`aladin.popup` expõe `setTitle`, `setText`, `setSource` e `show`.

**Bloqueio — consistência entre o HiPS e o catálogo do banco**: a página
`/catalog/{schema}/{table}/cluster_detail/{id}` busca o registro no banco pela coluna
`property_id` do catálogo `{schema}/{table}`. O cluster clicado vem do HiPS, que é outra
fonte de dados. Para o link funcionar é preciso **garantir que o catálogo HiPS de
clusters é o mesmo catálogo que o usuário está usando** (mesmos clusters e mesmos ids):

- o `id` do HiPS (coluna `id` no WaZP Y6) tem que existir como valor da coluna
  `property_id` do catálogo aberto na tela;
- se o usuário estiver em outro catálogo de clusters, o link deve ser omitido (popup só
  com as informações do HiPS) em vez de levar a uma página "not found".

A definir: como associar um HiPS de clusters ao catálogo do banco (ex.: campo na config do
`clusterCatalogs` com o schema/table correspondente, ou uma configuração no próprio
catálogo registrado), e como o frontend decide se o catálogo aberto é o mesmo do HiPS.

### 2. Restaurar a config real do WaZP

A config em `useAladin.js` está apontando temporariamente para o catálogo público do DES
DR2, usando `MAG_AUTO_G_DERED` como raio, só para teste. Antes do merge:

```js
url: `${baseHost}/data/releases/des/dr2/catalogs/y6a2_dnf_wazp_v5_clusters/hips`,
radiusColumn: 'radius_amin', // arcmin
```

Colunas do HiPS WaZP Y6 (416.947 clusters): `name`, `id`, `ra`, `dec`, `zphot`, `zspec`,
`snr`, `ngals`, `radius_mpc`, `radius_amin`, `ra_cg`, `dec_cg`, entre outras.

### 3. CORS

O `canvas-dev` não devolve headers `Access-Control-Allow-*` em `/data/`. Rodando o
frontend em outro host (ex.: `localhost`), o navegador bloqueia os tiles. Com
`requestCredentials: 'include'` o nginx precisa ecoar a origem exata e enviar
`Access-Control-Allow-Credentials: true`; se o catálogo for público, dá para remover
`requestCredentials` da config e usar `Access-Control-Allow-Origin: *`.

### 4. Testes restantes

- Página `cluster_detail/[id]` (só a tela do catálogo foi testada no navegador).
- Trocar o estilo com o catálogo escondido (deve continuar escondido).
- Catálogo real do WaZP: conferir se o raio desenhado bate com o círculo do cluster
  selecionado vindo do banco.

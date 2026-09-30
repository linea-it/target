---
title: "Catálogo HiPS de photo-z (cor por valor de z) no Aladin do Cluster Detail"
status: "Implementado (controle de catálogo); config real pendente"
date: 2026-09-30
author: glauber.vila.verde@gmail.com
---

# Catálogo HiPS de photo-z (cor por valor de z) no Aladin do Cluster Detail

## Contexto

Seguindo o catálogo HiPS de clusters (`docs/cluster-hips-catalog-plan.md`), foi pedida
uma nova categoria de catálogo: **photo-z**. Cada fonte é desenhada com um shape padrão
do Aladin (circle, square, plus, cross, triangle, rhomb), mas a cor depende do valor
float da coluna de photo-z, mapeado num colormap contínuo (viridis) entre `zMin` e `zMax`.

## Como a cor por fonte funciona

A opção `color` do catálogo do aladin-lite (3.7.0-beta) não aceita função. Porém,
`Catalog.prototype.computeFootprints` (reusado pelo `ProgressiveCat`) chama a shape
function de 1 argumento por fonte e, se ela retorna um `HTMLCanvasElement`, faz
`source.setImage(canvas)`; o `drawSource` desenha esse canvas centralizado na fonte.
A shape function do photo-z devolve o shape escolhido já pintado na cor do seu z.
Os canvases ficam em cache por nível de cor (64 níveis), então há no máximo 64 por estilo.

Fontes sem valor de z recebem o shape padrão na cor do catálogo (cinza `#9e9e9e`).

Limitação: fontes desenhadas como imagem não mudam de aparência em hover/seleção.

## Implementado

- `frontend/src/components/Aladin/photozColors.js`: colormap viridis
  (`colormapColor`, `zToColorIndex`, `colorForIndex`, `colormapGradientCss`) e
  `drawShapeCanvas` (mesmo desenho do `Catalog.createShape` do Aladin).
- `frontend/src/components/Aladin/useAladin.js`
  - Lista `photozCatalogs`: `id`, `name`, `url`, `zColumn`, `zRange` (intervalo default
    do colormap), `options`, `requireGroup` opcional. Catálogos sem `url` não são listados.
  - `makePhotozColorShape(cfg, style)` e métodos `getPhotozCatalogs`, `setPhotozCatalog`,
    `setPhotozCatalogVisibility`, `removePhotozCatalog`, com o estado `photozOverlay`
    (`{ catalogId, shape, sourceSize, zMin, zMax, visible }`) exposto no AladinContext.
  - Mudança de estilo recria o catálogo (mesma razão dos clusters). A remoção dos dois
    catálogos HiPS sob demanda usa `detachHipsCatalog(ref)`.
- `frontend/src/components/Aladin/PhotozCatalogDialog/index.js`: popup (catálogo, shape,
  tamanho, intervalo de z com colorbar, Show/Hide, Remove).
- Botão "Photo-z catalog" (`GradientIcon`) em `components/ClusterDetail/index.js` e
  `containers/ClusterDetail/index.js`, ao lado do "Clusters catalog".

## Pendências

1. **Config real**: em `useAladin.js`, `photozCatalogs` está com `url: ''` (por isso o
   botão aparece desabilitado) e `zColumn: 'z'` como placeholder. Preencher url do HiPS,
   nome da coluna de photo-z, `zRange` típico e `requireGroup`, se privado.
2. **CORS**: mesma questão dos clusters (`requestCredentials: 'include'` exige que o nginx
   ecoe a origem e envie `Access-Control-Allow-Credentials: true`).
3. **Teste no navegador** com o catálogo real: cores, troca de shape/tamanho/intervalo,
   Show/Hide, Remove e persistência do estado ao reabrir o popup.

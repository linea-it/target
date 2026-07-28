---
title: "MapControls: overlays de mapas HiPS com opacidade no Aladin Lite"
description: >
  Plano/registro da implementação do componente MapControls no Sky Viewer,
  com todos os detalhes da API do aladin-lite necessários para replicar a
  funcionalidade em outra aplicação.
date: 2026-07-10
project: sky_viewer
status: implemented
branch: feature/systematic_maps
tags:
  - aladin-lite
  - hips
  - overlay
  - systematic-maps
  - des-dr2
  - react
  - mui
---

# MapControls — overlays de mapas HiPS com opacidade

## Objetivo

Adicionar ao viewer uma terceira seção de controles, **Maps**, ao lado de
**Images** (troca da imagem base) e **Catalogs** (catálogos HiPS). Um "mapa"
é uma imagem HiPS (ex: mapas sistemáticos do DES DR2 — fracdet por banda)
aplicada como **layer de overlay** sobre a imagem base, com **opacidade
ajustável** — o mesmo comportamento do botão nativo "+ Surveys" do Aladin.

## Requisitos de UX (decisões de produto)

- A seção Maps é **independente** da imagem base selecionada: uma linha por
  survey que possui mapas (hoje só DES DR2). O usuário pode ativar o mapa do
  DES mesmo visualizando outra imagem base.
- Cada linha tem: **ícone de olho** (toggle de visibilidade), nome do survey,
  **lixeira** (remove a layer) e expand/collapse.
- Dentro do collapse: **um único Select** com todos os mapas do survey no
  formato "Categoria banda" (ex: "Fracdet g", "Fracdet Y") e um **slider de
  opacidade** (0–1, passo 0.05, default **0.8**).
- O mapa **só é aplicado quando o usuário escolhe a banda** no Select — e
  isso já o torna visível (olho aberto automaticamente).
- O olho alterna a visibilidade **sem perder** a banda escolhida nem a
  opacidade. Clicar no olho sem banda escolhida apenas abre o collapse.
- Trocar de banda **substitui** a layer (uma única layer por survey).
- A lixeira remove a layer da pilha do Aladin e reseta a linha (select
  vazio, olho fechado, opacidade 0.8).
- A estrutura de dados deve permitir adicionar novas categorias (ex: maglim)
  e novos surveys apenas acrescentando entradas — sem mudar código.

## A parte importante: API do aladin-lite (v3)

Descobertas verificadas diretamente no bundle
(`node_modules/aladin-lite/dist/aladin.js`). São o núcleo do que precisa ser
replicado em outra aplicação:

### 1. Layers de imagem são nomeadas; a base é só a layer `"base"`

```js
// O que o aladin faz internamente:
setBaseImageLayer(hips)            === setOverlayImageLayer(hips, "base")
setImageSurvey === setImageLayer   === setBaseImageLayer  // 1 argumento só!
addNewImageLayer(id)               === setOverlayImageLayer(id, uuidv4())  // botão "+ Surveys"
```

- `aladin.setOverlayImageLayer(hipsOuId, layerName)` **adiciona ou
  substitui** a layer com aquele nome e a retorna. Usar um layer name
  estável por survey (ex: `map-des_dr2`) dá de graça o "trocar banda
  substitui a layer".
- Trocar a imagem base substitui **apenas** a layer `"base"` → overlays
  nomeados **persistem** quando o usuário troca de survey base.
- **Pegadinha**: `setImageSurvey(hips, options)` ignora o 2º argumento —
  é alias de `setBaseImageLayer(g)`, que recebe 1 parâmetro. Options
  passadas ali nunca tiveram efeito.

### 2. Pré-registrar os HiPS no cache do Aladin (menu nativo)

```js
const hips = aladin.createImageSurvey(id, name, url, cooFrame);
// -> cria o objeto HiPS e faz this.hipsCache.append(id, config)
```

`createImageSurvey` registra o survey no `hipsCache`, que é o que alimenta
o **menu/select nativo de surveys** do Aladin. Pré-registrar todos os mapas
no init (sem exibi-los) faz com que apareçam no menu nativo, e a aplicação
depois só referencia o objeto pronto. **Criar o HiPS na hora com
`A.imageHiPS(url, options)` e passar direto ao `setOverlayImageLayer` não
renderizou de forma confiável** — a layer entrava na pilha mas os tiles não
carregavam (ver CORS abaixo); com pré-registro o comportamento fica idêntico
ao "+ Surveys" nativo.

### 3. Opacidade e visibilidade

```js
const layer = aladin.setOverlayImageLayer(hips, 'map-des_dr2');
layer.setOpacity(0.8);      // 0..1
```

- O idioma do próprio aladin-lite para esconder/mostrar é **opacity 0 ↔
  valor anterior** (o `HiPS.toggle()` interno faz exatamente isso).
  Esconder via `setOpacity(0)` mantém a posição na pilha e o cache de tiles
  (sem re-download ao reexibir). Não usar o `toggle()` nativo: ele guarda um
  `prevOpacity` interno que pode dessincronizar do estado do app — guardar a
  opacidade no estado do app e fazer `setOpacity(visible ? valor : 0)`.
- Remover de verdade: `aladin.removeImageLayer(layerName)` (a mesma API da
  lixeira nativa).

### 4. Pegadinha de CORS com `requestCredentials`

O servidor de dados (`datasets.linea.org.br`) responde
`Access-Control-Allow-Origin: *`. Requests com `requestCredentials:
'include'` **são bloqueados pelo navegador** nessa combinação (credenciais
exigem origem explícita). Sintoma: a layer aparece na pilha do Aladin mas
**nenhum tile carrega** (imagem não aparece). Para HiPS públicos, **não**
passar `requestCredentials`.

### 5. Pegadinha do evento `AL:HiPSLayer.added`

O evento dispara para **qualquer** layer adicionada — inclusive overlays.
Se o listener faz `gotoObject(targetDefault)` do survey base (padrão comum
para centralizar ao trocar de imagem), ativar um mapa **teleporta a visão**.
Guardar o id da base anterior num ref e só re-centralizar quando
`getBaseImageLayer().id` realmente mudou.

### 6. Frame de coordenadas (`cooFrame`)

`createImageSurvey(id, name, url, cooFrame)` aceita `"equatorial"` /
`"galactic"`. O `properties` do HiPS declara `hips_frame`. **Problema
conhecido em aberto**: os HiPS dos mapas fracdet do DES declaram
`hips_frame=galactic` enquanto a imagem DES é `equatorial`, e o mapa
renderiza rotacionado/espelhado em relação ao survey (nem forçar galactic
nem equatorial alinhou) — indício de erro na **geração** do HiPS no servidor
(conferir `COORDSYS` do HEALPix de origem, `'C'` vs `'G'`, e o parâmetro
`hips_frame` do hipsgen). O frontend está com `equatorial` + comentário TODO.

## Arquitetura implementada (referência: sky_viewer)

Arquivos em `frontend/components/Aladin/`:

| Arquivo | Papel |
|---|---|
| `useAladin.js` | Hook central: dados, init do Aladin, funções de mapa |
| `AladinContext.js` / `AladinProvider.js` | Contexto React expondo o retorno do hook |
| `Controls.js` | Sidebar: `SurveyControls` / `CatalogControls` / `MapControls` |
| `MapControls/index.js` | Seção "Maps"; oculta se `mapsList` vazio |
| `MapControls/MapListItem.js` | Linha do survey: olho, lixeira, collapse |
| `MapControls/MapSelect.js` | `TextField select` (MUI) com os mapas |
| `MapControls/OpacitySlider.js` | `Slider` MUI 0–1, passo 0.05 |

### Modelo de dados (hardcoded no hook, mesmo padrão de surveys/catalogs)

```js
const maps = [
  {
    surveyKey: 'des_dr2',        // layer name do overlay: `map-des_dr2`
    name: 'DES DR2',
    cooFrame: 'equatorial',
    // requireGroup / devOnly opcionais (mesma semântica dos surveys)
    categories: [
      {
        id: 'frac_detection',
        label: 'Fracdet',
        baseUrl: 'https://datasets.linea.org.br/data/releases/des/dr2/maps/systematic_maps/frac_detection',
        bands: [
          { value: 'g', label: 'g' },
          { value: 'r', label: 'r' },
          { value: 'i', label: 'i' },
          { value: 'z', label: 'z' },
          { value: 'y', label: 'Y' },   // label DES é Y maiúsculo, URL é hips_y
        ],
      },
      // futuro: { id: 'maglim', label: 'Maglim', baseUrl: '.../maglim', bands: [...] }
    ],
  },
];
```

Cada par (categoria, banda) gera:
`mapId = ${cat.id}_${band.value}` • `label = ${cat.label} ${band.label}` •
`url = ${cat.baseUrl}/hips_${band.value}/`.

`mapsList` = `maps` filtrado por `requireGroup`/`devOnly` (controle de acesso
por grupo do usuário, igual a surveys/catalogs) — é o que a UI renderiza.

### Estado e funções no hook

```js
const mapSurveysRef = useRef({});     // { [surveyKey]: { [mapId]: hips } } pré-registrados
const mapLayersRef  = useRef({});     // { [surveyKey]: { mapId, hips, opacity, visible } }
const lastBaseSurveyIdRef = useRef(null);  // guarda p/ o listener HiPSLayer.added
```

**No init** (depois de criar surveys e catálogos), para cada survey×categoria×banda:

```js
const hips_map = aladin.createImageSurvey(
  `${surveyKey}_${mapId}`,                    // id único
  `${group.name} ${cat.label} ${band.label}`, // nome exibido: "DES DR2 Fracdet g"
  url,
  group.cooFrame
);
mapSurveysRef.current[surveyKey][mapId] = hips_map;
```

**Funções expostas no contexto** (todas `useCallback`):

```js
// Aplica/substitui o overlay; sempre visível (= comportamento do "+ Surveys")
setMapOverlay(surveyKey, mapId, opacity = 0.8) {
  const hips = mapSurveysRef.current[surveyKey]?.[mapId];
  const layer = aladin.setOverlayImageLayer(hips, `map-${surveyKey}`);
  layer.setOpacity(opacity);
  mapLayersRef.current[surveyKey] = { mapId, hips: layer, opacity, visible: true };
}

setMapOpacity(surveyKey, opacity) {
  const l = mapLayersRef.current[surveyKey];
  if (!l) return;                       // slider antes de escolher banda: no-op
  l.opacity = opacity;
  if (l.visible) l.hips.setOpacity(opacity);
}

setMapVisibility(surveyKey, visible) {  // opacity 0 <-> valor guardado
  const l = mapLayersRef.current[surveyKey];
  if (!l) return;
  l.visible = visible;
  l.hips.setOpacity(visible ? l.opacity : 0);
}

removeMapOverlay(surveyKey) {           // lixeira
  aladin.removeImageLayer(`map-${surveyKey}`);
  delete mapLayersRef.current[surveyKey];
}
```

No cleanup do effect de init, zerar `mapSurveysRef`, `mapLayersRef` e
`lastBaseSurveyIdRef` (evita reusar objetos HiPS órfãos após re-init).

### Componente de linha (`MapListItem`)

Estado local: `open` (collapse), `visible` (olho), `mapId` (`''` = nenhum),
`opacity` (0.8). Handlers:

- **olho**: sem `mapId` → só `setOpen(true)`; com `mapId` →
  `setMapVisibility(surveyKey, !visible)`.
- **select**: `setMapOverlay(surveyKey, value, opacity)` + `visible=true`.
- **slider**: `setMapOpacity(surveyKey, value)`.
- **lixeira** (disabled sem `mapId`): `removeMapOverlay(surveyKey)` +
  reset (`mapId=''`, `visible=false`, `opacity=0.8`).

## Cronologia dos problemas encontrados (para não repetir)

1. **v1 (falhou)**: criar HiPS na hora com `A.imageHiPS(url, {opacity,
   requestCredentials:'include'})` + `setOverlayImageLayer`. A layer entrava
   na pilha mas a imagem não aparecia — era preciso re-selecionar o survey
   manualmente no menu da layer. Causa: CORS bloqueando tiles
   (credenciais + `ACAO: *`); o `requestCredentials` copiado dos surveys
   base nunca fora testado de verdade, pois `setImageSurvey` ignora options.
2. **v2 (funcionou)**: pré-registro via `createImageSurvey` no init +
   `setOverlayImageLayer(hipsPreRegistrado, 'map-<surveyKey>')` +
   `layer.setOpacity()` — réplica exata do fluxo do botão nativo.
3. **Efeito colateral corrigido**: `AL:HiPSLayer.added` re-centralizava a
   visão ao adicionar o mapa (guard com `lastBaseSurveyIdRef`).
4. **Em aberto (dados, não frontend)**: desalinhamento do fracdet por frame
   de coordenadas na geração do HiPS (ver seção cooFrame).

## Checklist de verificação manual

1. Seção Maps aparece com linha "DES DR2"; expand mostra Select + Opacity.
2. Escolher "Fracdet g" → layer extra "DES DR2 Fracdet g" na pilha nativa
   do Aladin, sobre a base; olho abre sozinho; tiles carregam de
   `.../frac_detection/hips_g/` (aba Network).
3. Slider 0.5 → base aparece por transparência.
4. Olho fecha/abre → mapa some/volta com mesma banda e opacidade, sem
   re-download.
5. Trocar para "Fracdet r" → substitui a layer (continua uma só).
6. Trocar imagem base e voltar → overlay persiste; visão não teleporta ao
   ativar mapa.
7. Lixeira → layer some da pilha; linha resetada; lixeira desabilita.
8. `npm run lint` limpo.

## Notas operacionais (ambiente de dev)

O frontend roda em container com o diretório montado em `/app`
(`docker-compose.local.yml`). O cache `.next` grava caminhos absolutos:
rodar `npm run dev` **local** corrompe o React Client Manifest visto pelo
container (erro "Could not find the module ... in the React Client
Manifest"). Correção: `rm -rf frontend/.next` + restart do container. Para
verificar mudanças, usar o hot-reload do próprio container.

// Config dos catálogos HiPS sob demanda do Aladin (clusters e photo-z).
// Compartilhada entre o useAladin (que cria os catálogos) e a página de
// Settings do catálogo (que define o catálogo/estilo padrão de cada um).

import { DEFAULT_COLORMAP } from './photozColors';

// Estilos iniciais quando não há overlay ativo nem default salvo no Settings.
export const DEFAULT_CLUSTER_STYLE = { color: '#ff9800', opacity: 0.8, lineWidth: 2 };
export const DEFAULT_PHOTOZ_STYLE = { shape: 'circle', sourceSize: 8, colormap: DEFAULT_COLORMAP };

// Catálogos HiPScat de clusters (céu inteiro). Diferente dos catálogos do
// useAladin, não são pré-carregados: são criados sob demanda pelo ClusterCatalogDialog
// e cada fonte é desenhada como um círculo com o raio do cluster.
export function buildClusterCatalogs(baseHost) {
  return [
    {
      id: 'y6a2_dnf_wazp_v5_clusters',
      name: 'DES Y6 WaZP v5 clusters',
      // url: 'https://datasets.linea.org.br/data/releases/des/dr2/catalogs/hips/', // TODO: temporária, trocar pela url com baseHost
      // radiusColumn: 'MAG_AUTO_G_DERED',
      url: `${baseHost}/data/releases/des/dr2/catalogs/y6a2_dnf_wazp_v5_clusters/hips`,
      radiusColumn: 'radius_amin', // Coluna com o raio do cluster
      radiusUnit: 'arcmin', // Unidade da coluna de raio: 'deg' | 'arcmin' | 'arcsec'
      defaultRadiusArcmin: 1, // Usado quando a fonte não tem valor de raio
      options: {
        requestCredentials: 'include',
        requestMode: 'cors',
      },
      // requireGroup: 'TODO',
    },
  ];
}

// Catálogos HiPScat de photo-z. Mesmo esquema dos de clusters (sob demanda,
// pelo PhotozCatalogDialog), mas cada fonte é desenhada com um shape padrão
// cuja cor vem do valor de z (colormap entre zMin e zMax).
export function buildPhotozCatalogs(baseHost) {
  const catalogs = [
    {
      id: 'photoz',
      name: 'Redshift',
      // url: 'https://datasets.linea.org.br/data/releases/des/dr2/catalogs/hips/', // TODO: temporária, trocar pela url com baseHost
      // zColumn: 'MAG_AUTO_G_DERED',
      // zRange: [0, 24],
      url: `${baseHost}/data/releases/des/dr2/catalogs/341_ref_z_clean/hips`, // TODO: url do HiPS de photo-z (sem url o catálogo não é listado)
      zColumn: 'z', // TODO: coluna com o valor de photo-z
      zMinValue: 0.0001, // Menor valor de z do catálogo (limite inferior do slider)
      zMaxValue: 21.139999, // Maior valor de z do catálogo (limite superior do slider)
      // zRange: [0, 1.5], // Intervalo default do colormap; sem ele, usa os limites do slider
      options: {
        requestCredentials: 'include',
        requestMode: 'cors',
      },
      // requireGroup: 'TODO',
    },
  ];
  // Sem zRange explícito, o intervalo default do colormap são os limites do slider.
  return catalogs.map(cat => ({ ...cat, zRange: cat.zRange ?? zSliderBounds(cat) }));
}

// Passo do slider de intervalo de z (dialog e Settings).
export const Z_SLIDER_STEP = 0.01;

/**
 * Limites do slider de intervalo de z: o menor e o maior valor de z do
 * catálogo (zMinValue/zMaxValue), arredondados para fora no passo do slider
 * para que os valores do slider caiam em múltiplos de 0.01 sem excluir fontes.
 * Sem esses atributos, usa o zRange com 50% de folga (ou [0, 1] sem zRange).
 */
export function zSliderBounds(catalog) {
  const [rangeMin, rangeMax] = catalog?.zRange ?? [0, 1];
  const pad = (rangeMax - rangeMin) * 0.5;
  const min = catalog?.zMinValue ?? Math.max(0, rangeMin - pad);
  const max = catalog?.zMaxValue ?? rangeMax + pad;
  return [
    Math.floor(min / Z_SLIDER_STEP) * Z_SLIDER_STEP,
    Math.ceil(max / Z_SLIDER_STEP) * Z_SLIDER_STEP,
  ].map(v => Number(v.toFixed(2)));
}

/** Catálogos que o usuário pode usar: com url e com acesso ao grupo. */
export function listAvailable(catalogs, userGroups = []) {
  return catalogs
    .filter(cat => cat.url)
    .filter(cat => !cat.requireGroup || userGroups.includes(cat.requireGroup));
}

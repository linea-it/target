// Config do overlay de clusters vizinhos do Aladin (Cluster Detail).
// Os vizinhos vêm da mesma tabela do cluster exibido, por uma busca por área
// no endpoint data/ (cone_ra/cone_dec/cone_radius/cone_method), centrada no
// cluster, com raio = raio do cluster × fator, limitado a maxRadiusDeg.
// Compartilhada entre useNeighborClusters, NeighborClustersDialog e o card
// de Settings do catálogo (Settings.neighbor_clusters).

// Métodos de busca expostos ao frontend. O backend também aceita 'q3c'
// (cone com índice espacial), oculto por ora; para reativar, adicionar
// { value: 'q3c', label: 'Cone (q3c)' } e voltar o select no dialog/Settings.
// Um método salvo que não esteja aqui volta para o default.
export const NEIGHBOR_METHODS = [
  { value: 'box', label: 'Box (ra/dec range)' },
];

// Teto do raio de busca (mesmo valor de MAX_CONE_RADIUS_DEG no backend).
export const MAX_SEARCH_RADIUS_DEG = 1;

// Fator máximo do raio de busca (× raio do cluster); o teto acima ainda vale.
export const MAX_SEARCH_FACTOR = 50;

// Máximo de vizinhos por requisição; acima disso o resultado é truncado.
export const NEIGHBORS_PAGE_SIZE = 1000;

export const DEFAULT_NEIGHBOR_CLUSTERS = {
  factor: 5,
  maxRadiusDeg: 1,
  method: 'box',
  color: '#ff9800',
  opacity: 0.8,
  lineWidth: 2,
};

// Chaves de Settings.neighbor_clusters além de showOnOpen.
const PARAM_KEYS = Object.keys(DEFAULT_NEIGHBOR_CLUSTERS);

/** Parâmetros efetivos: defaults + o que estiver salvo no Settings. */
export function neighborParamsFromSettings(saved) {
  const params = { ...DEFAULT_NEIGHBOR_CLUSTERS };
  PARAM_KEYS.forEach((key) => {
    if (saved?.[key] !== undefined && saved?.[key] !== null) params[key] = saved[key];
  });
  if (!NEIGHBOR_METHODS.some(m => m.value === params.method)) {
    params.method = DEFAULT_NEIGHBOR_CLUSTERS.method;
  }
  return params;
}

/**
 * Raio de um cluster em arcmin: coluna de raio (meta_radius_arcmin, UCD
 * phys.angSize;src); sem ela, o default_marker_size do catálogo (arcsec);
 * sem nenhum dos dois, 5 arcsec. Mesma regra do círculo do cluster exibido.
 */
export function clusterRadiusArcmin(row, settings) {
  const radius = parseFloat(row?.meta_radius_arcmin);
  if (Number.isFinite(radius) && radius > 0) return radius;
  const marker = parseFloat(settings?.default_marker_size);
  if (Number.isFinite(marker) && marker > 0) return marker / 60;
  return 5 / 60;
}

/** Raio da busca (graus): raio do cluster × fator, limitado ao teto. */
export function neighborSearchRadiusDeg(record, settings, params) {
  const maxRadius = Math.min(params.maxRadiusDeg, MAX_SEARCH_RADIUS_DEG);
  return Math.min(maxRadius, (clusterRadiusArcmin(record, settings) * params.factor) / 60);
}

/** Formata um raio em graus com a unidade mais legível. */
export function formatAngle(deg) {
  if (!Number.isFinite(deg)) return '';
  if (deg >= 1) return `${deg.toFixed(2)}°`;
  if (deg * 60 >= 1) return `${(deg * 60).toFixed(1)}′`;
  return `${(deg * 3600).toFixed(1)}″`;
}

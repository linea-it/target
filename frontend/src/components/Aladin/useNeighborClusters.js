'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAladinContext } from './AladinContext';
import {
  NEIGHBORS_PAGE_SIZE,
  clusterRadiusArcmin,
  neighborParamsFromSettings,
  neighborSearchRadiusDeg,
} from './neighborClusters';
import { getNeighborClusters } from '@/services/Metadata';

/**
 * Clusters vizinhos do cluster exibido: busca por área na mesma tabela
 * (raio do cluster × fator, limitado a maxRadiusDeg) e desenho no Aladin.
 *
 * - `enabled` liga a busca e o overlay (Show no dialog, ou showOnOpen do
 *   Settings.neighbor_clusters); Remove desliga.
 * - Trocar de cluster, fator, raio máximo ou método refaz a busca (está na
 *   queryKey); mudar só o estilo redesenha sem nova requisição.
 * - O próprio cluster exibido não entra na lista de vizinhos.
 */
export function useNeighborClusters(catalog, record) {
  const {
    isReady,
    neighborClusters,
    setNeighborClusters,
    setNeighborClustersVisibility,
    removeNeighborClusters,
  } = useAladinContext();

  const saved = catalog?.settings?.neighbor_clusters;
  const [params, setParamsState] = useState(() => neighborParamsFromSettings(saved));
  const [enabled, setEnabled] = useState(!!saved?.showOnOpen);

  // Catálogo carregado depois (ou trocado): volta aos defaults dele.
  useEffect(() => {
    setParamsState(neighborParamsFromSettings(saved));
    setEnabled(!!saved?.showOnOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog?.id]);

  const setParams = (changes) => setParamsState(prev => ({ ...prev, ...changes }));

  // O record pode ser de outro catálogo (fica na sessão ao trocar de catálogo).
  const hasRecord = !!record
    && record.meta_catalog_id === catalog?.id
    && Number.isFinite(parseFloat(record.meta_ra))
    && Number.isFinite(parseFloat(record.meta_dec));

  const searchRadiusDeg = hasRecord ? neighborSearchRadiusDeg(record, catalog?.settings, params) : null;

  const query = useQuery({
    queryKey: ['neighborClusters', catalog?.id, record?.meta_id, searchRadiusDeg, params.method],
    queryFn: async () => {
      const start = performance.now();
      const response = await getNeighborClusters({
        tableId: catalog.id,
        ra: parseFloat(record.meta_ra),
        dec: parseFloat(record.meta_dec),
        radiusDeg: searchRadiusDeg,
        method: params.method,
        pageSize: NEIGHBORS_PAGE_SIZE,
      });
      return {
        rows: response.data.results ?? [],
        hasMore: !!response.data.has_more,
        total: response.data.count,
        elapsedMs: performance.now() - start,
      };
    },
    enabled: enabled && isReady && hasRecord,
    staleTime: 5 * 60000,
    retry: false,
  });

  const neighbors = useMemo(() => {
    if (!query.data) return null;
    const currentId = String(record?.meta_id);
    return query.data.rows.filter(row => String(row.meta_id) !== currentId);
  }, [query.data, record?.meta_id]);

  useEffect(() => {
    if (!isReady) return;
    if (!enabled) {
      removeNeighborClusters();
      return;
    }
    // Erro na busca: não deixa no Aladin os vizinhos de outro cluster.
    if (query.isError) {
      removeNeighborClusters();
      return;
    }
    if (!neighbors) return;

    setNeighborClusters(
      neighbors,
      {
        color: params.color,
        opacity: params.opacity,
        lineWidth: params.lineWidth,
        fallbackRadiusArcmin: clusterRadiusArcmin(null, catalog?.settings),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, enabled, neighbors, query.isError, params.color, params.opacity, params.lineWidth]);

  const error = query.error
    ? (query.error.response?.data?.error ?? query.error.message ?? 'Request failed')
    : null;

  return {
    params,
    setParams,
    enabled,
    // Show liga o overlay já visível.
    show: () => {
      setNeighborClustersVisibility(true);
      setEnabled(true);
    },
    remove: () => setEnabled(false),
    visible: enabled && (neighborClusters?.visible ?? true),
    setVisible: setNeighborClustersVisibility,
    hasRecord,
    searchRadiusDeg,
    isFetching: query.isFetching,
    count: neighbors?.length ?? null,
    hasMore: query.data?.hasMore ?? false,
    elapsedMs: query.data?.elapsedMs ?? null,
    error,
  };
}

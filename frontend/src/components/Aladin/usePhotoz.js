'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAladinContext } from './AladinContext';
import { neighborSearchRadiusDeg } from './neighborClusters';
import { PHOTOZ_PAGE_SIZE, photozParamsFromSettings, resolvePhotozTable } from './photoz';
import { getPhotozSources, getPhotozTables } from '@/services/Metadata';

/** Tabelas de photo-z que o usuário pode ler (dialog e Settings). */
export function usePhotozTables() {
  return useQuery({
    queryKey: ['photozTables'],
    queryFn: async () => (await getPhotozTables()).data ?? [],
    staleTime: 5 * 60000,
  });
}

/**
 * Fontes de photo-z ao redor do cluster exibido: busca por área numa tabela
 * de photo-z (raio do cluster × fator, limitado a maxRadiusDeg), filtrada
 * pelo intervalo de z, e desenho no Aladin com a cor de cada z.
 *
 * - `enabled` liga a busca e o overlay (Show no dialog, ou showOnOpen do
 *   Settings.photoz); Remove desliga.
 * - Trocar de cluster, tabela, fator, raio máximo ou intervalo de z refaz a
 *   busca (está na queryKey); shape, tamanho e colormap só redesenham.
 */
export function usePhotoz(catalog, record) {
  const {
    isReady,
    photozOverlay,
    setPhotozSources,
    setPhotozVisibility,
    removePhotozSources,
  } = useAladinContext();

  const saved = catalog?.settings?.photoz;
  const [params, setParamsState] = useState(() => photozParamsFromSettings(saved));
  const [tableId, setTableId] = useState(saved?.tableId ?? null);
  const [enabled, setEnabled] = useState(!!saved?.showOnOpen);

  // Catálogo carregado depois (ou trocado): volta aos defaults dele.
  useEffect(() => {
    setParamsState(photozParamsFromSettings(saved));
    setTableId(saved?.tableId ?? null);
    setEnabled(!!saved?.showOnOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog?.id]);

  const setParams = (changes) => setParamsState(prev => ({ ...prev, ...changes }));

  const tablesQuery = usePhotozTables();
  const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  // Tabela salva que o usuário não pode ler é ignorada (usa a primeira).
  const table = resolvePhotozTable(tables, tableId);

  // O record pode ser de outro catálogo (fica na sessão ao trocar de catálogo).
  const hasRecord = !!record
    && record.meta_catalog_id === catalog?.id
    && Number.isFinite(parseFloat(record.meta_ra))
    && Number.isFinite(parseFloat(record.meta_dec));

  const searchRadiusDeg = hasRecord ? neighborSearchRadiusDeg(record, catalog?.settings, params) : null;

  const query = useQuery({
    queryKey: ['photoz', table?.id, record?.meta_id, searchRadiusDeg, params.zMin, params.zMax],
    queryFn: async () => {
      const start = performance.now();
      const response = await getPhotozSources({
        tableId: table.id,
        ra: parseFloat(record.meta_ra),
        dec: parseFloat(record.meta_dec),
        radiusDeg: searchRadiusDeg,
        zColumn: table.z_column,
        zMin: params.zMin,
        zMax: params.zMax,
        pageSize: PHOTOZ_PAGE_SIZE,
      });
      return {
        rows: response.data.results ?? [],
        hasMore: !!response.data.has_more,
        elapsedMs: performance.now() - start,
      };
    },
    enabled: enabled && isReady && hasRecord && !!table?.z_column,
    staleTime: 5 * 60000,
    retry: false,
  });

  const tableTitle = table?.title;

  useEffect(() => {
    if (!isReady) return;
    if (!enabled || !table) {
      removePhotozSources();
      return;
    }
    // Erro na busca: não deixa no Aladin as fontes de outro cluster.
    if (query.isError) {
      removePhotozSources();
      return;
    }
    if (!query.data) return;

    setPhotozSources(query.data.rows, {
      name: tableTitle ? `Photo-z: ${tableTitle}` : 'Photo-z',
      shape: params.shape,
      sourceSize: params.sourceSize,
      colormap: params.colormap,
      zMin: params.zMin,
      zMax: params.zMax,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, enabled, !!table, tableTitle, query.data, query.isError, params.shape, params.sourceSize, params.colormap]);

  const error = query.error
    ? (query.error.response?.data?.error ?? query.error.message ?? 'Request failed')
    : null;

  return {
    tables,
    tablesLoading: tablesQuery.isLoading,
    table,
    setTableId,
    params,
    setParams,
    enabled,
    // Show liga o overlay já visível.
    show: () => {
      setPhotozVisibility(true);
      setEnabled(true);
    },
    remove: () => setEnabled(false),
    visible: enabled && (photozOverlay?.visible ?? true),
    setVisible: setPhotozVisibility,
    hasRecord,
    searchRadiusDeg,
    isFetching: query.isFetching,
    count: query.data ? query.data.rows.length : null,
    hasMore: query.data?.hasMore ?? false,
    elapsedMs: query.data?.elapsedMs ?? null,
    error,
  };
}

'use client';
import { useEffect, useRef } from 'react';
import { useAladinContext } from './AladinContext';
import { DEFAULT_CLUSTER_STYLE, DEFAULT_PHOTOZ_STYLE } from './hipsCatalogs';

/**
 * Aplica os defaults dos catálogos HiPS de clusters e photo-z salvos no
 * Settings do catálogo (cluster_hips / photoz_hips) quando o Aladin fica
 * pronto: com showOnOpen, o catálogo já abre visível com o estilo salvo.
 *
 * Roda uma única vez por instância do Aladin, para o catálogo não reaparecer
 * depois de o usuário removê-lo (ex.: ao trocar o cluster selecionado).
 */
export function useHipsCatalogDefaults(settings) {
  const {
    aladinRef,
    isReady,
    getClusterCatalogs,
    setClusterCatalog,
    getPhotozCatalogs,
    setPhotozCatalog,
  } = useAladinContext();
  const appliedForRef = useRef(null);

  useEffect(() => {
    if (!isReady || !settings || !aladinRef.current) return;
    if (appliedForRef.current === aladinRef.current) return;
    appliedForRef.current = aladinRef.current;

    const { catalogId: clusterId, showOnOpen: showClusters, ...clusterStyle } = settings.cluster_hips ?? {};
    if (showClusters && getClusterCatalogs().some(cat => cat.id === clusterId)) {
      setClusterCatalog(clusterId, { ...DEFAULT_CLUSTER_STYLE, ...clusterStyle, visible: true });
    }

    const { catalogId: photozId, showOnOpen: showPhotoz, ...photozStyle } = settings.photoz_hips ?? {};
    if (showPhotoz && getPhotozCatalogs().some(cat => cat.id === photozId)) {
      setPhotozCatalog(photozId, { ...DEFAULT_PHOTOZ_STYLE, ...photozStyle, visible: true });
    }
  }, [isReady, settings, aladinRef, getClusterCatalogs, setClusterCatalog, getPhotozCatalogs, setPhotozCatalog]);
}

'use client';
import { useEffect, useRef } from 'react';
import { useAladinContext } from './AladinContext';
import { DEFAULT_PHOTOZ_STYLE } from './hipsCatalogs';

/**
 * Aplica o default do catálogo HiPS de photo-z salvo no Settings do catálogo
 * (photoz_hips) quando o Aladin fica pronto: com showOnOpen, o catálogo já
 * abre visível com o estilo salvo. (O showOnOpen dos clusters vizinhos fica
 * no useNeighborClusters.)
 *
 * Roda uma única vez por instância do Aladin, para o catálogo não reaparecer
 * depois de o usuário removê-lo (ex.: ao trocar o cluster selecionado).
 */
export function useHipsCatalogDefaults(settings) {
  const {
    aladinRef,
    isReady,
    getPhotozCatalogs,
    setPhotozCatalog,
  } = useAladinContext();
  const appliedForRef = useRef(null);

  useEffect(() => {
    if (!isReady || !settings || !aladinRef.current) return;
    if (appliedForRef.current === aladinRef.current) return;
    appliedForRef.current = aladinRef.current;

    const { catalogId: photozId, showOnOpen: showPhotoz, ...photozStyle } = settings.photoz_hips ?? {};
    if (showPhotoz && getPhotozCatalogs().some(cat => cat.id === photozId)) {
      setPhotozCatalog(photozId, { ...DEFAULT_PHOTOZ_STYLE, ...photozStyle, visible: true });
    }
  }, [isReady, settings, aladinRef, getPhotozCatalogs, setPhotozCatalog]);
}

'use client';

import { createContext, useContext } from 'react';

/**
 * Criação do contexto do Aladin.
 */
export const AladinContext = createContext({
  containerRef: null,
  aladinRef: null,
  surveysRef: {},
  catalogsRef: {},
  isReady: false,
  currentSurveyId: null,
  setFoV: () => { },
  setTarget: () => { },
  setImageSurvey: () => { },
  toggleCatalogVisibility: () => { },
  addMarker: () => { },
  toggleMarkerVisibility: () => { },
  takeSnapshot: () => { },
  addCatalog: () => { },
  gotoRaDec: () => { },
  mapOverlays: {},
  getMapsForSurvey: () => null,
  setMapOverlay: () => { },
  setMapOpacity: () => { },
  setMapVisibility: () => { },
  removeMapOverlay: () => { },
  neighborClusters: null,
  setNeighborClusters: () => { },
  setNeighborClustersVisibility: () => { },
  removeNeighborClusters: () => { },
  photozOverlay: null,
  getPhotozCatalogs: () => [],
  setPhotozCatalog: () => { },
  setPhotozCatalogVisibility: () => { },
  removePhotozCatalog: () => { },
});

/**
 * Hook para acessar facilmente o contexto do Aladin.
 */
export function useAladinContext() {
  return useContext(AladinContext);
}

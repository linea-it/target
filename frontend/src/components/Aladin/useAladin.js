'use client';
import A from 'aladin-lite';
import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook para controlar o Aladin Lite, aguardando a lib A estar disponível.
 */
export function useAladin(aladinParams = {}, userGroups = [], baseHost) {
  const containerRef = useRef(null);
  const aladinRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const surveysRef = useRef({})
  const catalogsRef = useRef({})
  const mapsRef = useRef({})
  // Layers de overlay de mapa atualmente na pilha do Aladin, por surveyKey.
  const mapLayersRef = useRef({})
  const targetOverlayRef = useRef(null);
  const lastBaseSurveyIdRef = useRef(null);
  const [currentSurveyId, setCurrentSurveyId] = useState(null);
  // Espelha mapLayersRef para a UI: { [surveyKey]: { mapId, opacity } }
  const [mapOverlays, setMapOverlays] = useState({});

  const surveys = [
    // Adiciona imagem do DES DR2 (pública)
    {
      id: "DES_DR2_IRG_LIneA",
      name: "DES DR2 IRG at LIneA",
      url: "https://datasets.linea.org.br/data/releases/des/dr2/images/hips/",
      // cooFrame: "equatorial",
      cooFrame: "ICRSd",
      // HipsOptions: https://cds-astro.github.io/aladin-lite/global.html#HiPSOptions
      options: {
        requestCredentials: 'include',
        requestMode: 'cors',
      },
    },
    // Adiciona imagem do LSST DP0.2 (privada, requer grupo 'dp02')
    {
      id: "LSST_DP02_IRG_LIneA",
      name: "LSST DP0.2 IRG at LIneA",
      url: `${baseHost}/data/releases/lsst/dp02/images/hips/`,
      // cooFrame: "equatorial",
      cooFrame: "ICRSd",
      options: {
        requestCredentials: 'include',
        requestMode: 'cors',
      },
      requireGroup: 'lsst_dp0.2', // Grupo necessário para acesso
    },
    // Adiciona imagem do LSST DP1 (privada, requer grupo 'lsst_dp1')
    {
      id: "LSST_DP1_IRG_LIneA",
      name: "LSST DP1 IRG at LIneA",
      url: `${baseHost}/data/releases/lsst/dp1/images/hips`,
      cooFrame: "ICRSd",
      options: {
        requestCredentials: 'include',
        requestMode: 'cors',
      },
      requireGroup: 'lsst_dp1', // Grupo necessário para acesso
    },
    // Rubin First Look (pública)
    {
      id: "RUBIN_FIRST_LOOK_UGRI",
      name: "RUBIN FIRST LOOK",
      url: "https://images.rubinobservatory.org/hips/asteroids/color_ugri/",
      // cooFrame: "equatorial",
      cooFrame: "ICRSd",
      options: {},

    }

  ]


  // catálogos HiPScat
  const catalogs = [
    // Adiciona catálogo DES DR2 (público)
    {
      id: 'des_dr2',
      name: 'DES DR2 at LIneA',
      url: 'https://datasets.linea.org.br/data/releases/des/dr2/catalogs/hips/',
      options: { color: '#33ff42' }
    },
    // Adiciona catálogo LSST DP0.2 (privado)
    {
      id: 'lsst_dp02',
      name: 'LSST DP0.2 at LIneA',
      url: 'https://datasets.linea.org.br/data/releases/des/dr2/catalogs/hips/', // TODO: Url temporaria, deve ser alterada para o catálogo correto
      options: { color: '#2BC7EE' },
      requireGroup: 'dp02', // Grupo necessário para acesso
    },
    {
      id: 'lsst_dp1',
      name: 'LSST DP1',
      url: `${baseHost}/data/releases/lsst/dp1/catalogs/hips`,
      options: {
        color: '#2BC7EE',
        requestCredentials: 'include',
        requestMode: 'cors',
      },
      requireGroup: 'lsst_dp1',
    },
    // Adiciona Catalogos default do Aladin ( Simbad, Gaia DR3, 2MASS )
    {
      id: 'simbad',
      name: 'SIMBAD',
      url: 'https://hipscat.cds.unistra.fr/HiPSCatService/SIMBAD',
      options: {
        shape: 'circle', sourceSize: 8, color: '#318d80'
      }
    },
    {
      id: 'gaia-dr3',
      name: 'Gaia DR3',
      url: 'https://hipscat.cds.unistra.fr/HiPSCatService/I/355/gaiadr3',
      options: { shape: 'square', sourceSize: 8, color: '#6baed6' }
    },
    {
      id: '2mass',
      name: '2MASS',
      url: 'https://hipscat.cds.unistra.fr/HiPSCatService/II/246/out',
      options: { shape: 'plus', sourceSize: 8, color: '#dd2233' }
    }
  ]

  // Mapas sistemáticos (HiPS) — pré-registrados no init para aparecerem
  // no menu nativo "+ Surveys" do Aladin como layers de overlay.
  const maps = [
    {
      surveyKey: 'des_dr2',
      name: 'DES DR2',
      // Ids das imagens base (surveys) que possuem estes mapas. É o que casa
      // com catalog.settings.default_image para decidir quais mapas exibir.
      surveyIds: ['DES_DR2_IRG_LIneA'],
      // TODO: os HiPS fracdet declaram hips_frame=galactic mas a imagem DES é
      // equatorial; mapa pode renderizar desalinhado (problema na geração do HiPS).
      cooFrame: "ICRSd",
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
            { value: 'y', label: 'Y' }, // label DES é Y maiúsculo; URL é hips_y
          ],
        },
      ],
    },
  ]

  const defaultTargets = {
    // "DES_DR2_IRG_LIneA": "02 32 44.09 -35 57 39.5",
    "DES_DR2_IRG_LIneA": "45.5695474 -19.0760449",
    // "RUBIN_FIRST_LOOK_UGRI": "12 26 53.27 +08 56 49.0",
    "RUBIN_FIRST_LOOK_UGRI": "184.940790 +5.51919840",
    // "LSST_DP02_IRG_LIneA": "04 08 29.07 -37 02 47.9"
    "LSST_DP02_IRG_LIneA": "239.215847 -47.5856227",
    "LSST_DP1_IRG_LIneA": "02 39 35.55 -34 30 38.3",
  }

  useEffect(() => {
    let isCancelled = false;

    if (!containerRef.current) return;

    // Aguarda o carregamento completo da lib
    A.init.then(() => {
      if (isCancelled) return;

      // console.log('Aladin Lite initialized');
      // console.log('aladinRef.current:', aladinRef.current)

      // Verifica se o Aladin já foi inicializado
      if (aladinRef.current) {
        // console.warn('Aladin is already initialized');
        return;
      }

      aladinRef.current = A.aladin(containerRef.current, aladinParams);
      // setIsReady(true);

      // aladinRef.current.addListener('AL:zoom.changed', function (e) { console.log('Zoom changed', e); });
      // aladinRef.current.addListener('AL:HiPSLayer.added', function (e) { console.log('Hips added', e); });
      // aladinRef.current.addListener('AL:HiPSLayer.changed', function (e) { console.log('Hips changed', e); });
      // aladinRef.current.addListener('AL:HiPSLayer.swap', function (e) { console.log('Hips swaped', e); });

      // Evento disparado toda vez que uma imagem HIPS é selecionada ou alterada
      aladinRef.current.addListener('AL:HiPSLayer.added', () => {
        // console.log('Survey changed');
        const currentSurvey = aladinRef.current.getBaseImageLayer();
        if (currentSurvey) {
          setCurrentSurveyId(currentSurvey.id);

          // O evento dispara para qualquer layer adicionada, inclusive
          // overlays (ex: mapas). Só recentraliza quando a base mudou.
          const baseChanged = lastBaseSurveyIdRef.current !== currentSurvey.id;
          lastBaseSurveyIdRef.current = currentSurvey.id;

          if (targetOverlayRef.current || !baseChanged) {
            // Já tem um target setado ou a base não mudou.

          } else {
            // Não tem nenhum target selecionado, centraliza a imagem no target default.
            const target = defaultTargets[currentSurvey.id];
            if (target) {
              // Goto the target of the current survey
              aladinRef.current.gotoObject(target);
            }
          }
          // Indica que o Aladin e a Layer estão prontos
          setIsReady(true);
        }
      });


      // Adiciona as imagens HIPS
      surveys.forEach(survey => {

        // Verifica se o usuário tem acesso ao survey
        if (survey.requireGroup && !userGroups.includes(survey.requireGroup)) {
          // console.warn(`User does not have access to survey: ${survey.name}`);
          return; // Não adiciona o survey se o usuário não tiver acesso
        }

        if (survey.devOnly == true && isDev == false) {
          // console.warn(`Survey ${survey.name} is only available in dev mode.`);
          return; // Não adiciona o survey se não estiver em modo dev
        }

        const hips_survey = aladinRef.current.createImageSurvey(survey.id, survey.name, survey.url, survey.cooFrame);

        aladinRef.current.setImageSurvey(hips_survey, survey.options || {});

        surveysRef.current[survey.id] = hips_survey;
        // console.log(`${survey.name} HIPS IMAGE added`);
      })


      // Adiciona os catálogos HiPScat
      catalogs.forEach(cat => {
        if (cat.requireGroup && !userGroups.includes(cat.requireGroup)) {
          // console.warn(`User does not have access to catalog: ${cat.name}`);
          return; // Não adiciona o catálogo se o usuário não tiver acesso
        }

        if (cat.devOnly == true && isDev == false) {
          // console.warn(`Survey ${survey.name} is only available in dev mode.`);
          return; // Não adiciona o survey se não estiver em modo dev
        }

        const hips_cat = A.catalogHiPS(cat.url, {
          name: cat.name,
          onClick: 'showTable',
          ...cat.options,
        });

        hips_cat.hide(); // Esconde o catálogo inicialmente
        aladinRef.current.addCatalog(hips_cat);
        catalogsRef.current[cat.id] = hips_cat;
        // console.log(`${cat.name} HiPS catalog added`);
      })

      // Registra os mapas sistemáticos no cache de HiPS do Aladin.
      // Apenas registra (sem exibir): os mapas ficam disponíveis no menu
      // nativo "+ Surveys" e o usuário os adiciona como overlay pela UI.
      // Nesta versão do aladin-lite (3.7.0-beta) a lista do menu vem de
      // hipsFavorites, então além do createImageSurvey (que preenche o
      // hipsCache) é preciso chamar addHiPSToFavorites.
      // Não passar requestCredentials: o servidor responde ACAO: * e o
      // browser bloqueia tiles requisitados com credenciais.
      maps.forEach(group => {
        if (group.requireGroup && !userGroups.includes(group.requireGroup)) {
          return; // Não adiciona os mapas se o usuário não tiver acesso
        }

        group.categories.forEach(cat => {
          cat.bands.forEach(band => {
            const mapId = `${group.surveyKey}_${cat.id}_${band.value}`;
            const hips_map = aladinRef.current.createImageSurvey(
              mapId,
              `${group.name} ${cat.label} ${band.label}`, // ex: "DES DR2 Fracdet g"
              `${cat.baseUrl}/hips_${band.value}/`,
              group.cooFrame
            );
            aladinRef.current.addHiPSToFavorites(hips_map);
            mapsRef.current[mapId] = hips_map;
            // console.log(`${group.name} ${cat.label} ${band.label} HIPS MAP registered`);
          })
        })
      })
    });

    return () => {
      isCancelled = true;
      // Evita reusar layers órfãs de uma instância anterior do Aladin.
      mapLayersRef.current = {};
      setMapOverlays({});
    };
  }, [aladinParams]);

  // Recalcula o canvas quando o container muda de tamanho (ex.: mobile ↔ desktop)
  useEffect(() => {
    if (!isReady || !containerRef.current) return undefined;

    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isReady]);

  // Métodos utilitários

  const setFoV = useCallback((fov) => {
    aladinRef.current?.setFov(fov);
  }, []);

  const setTarget = useCallback((target, fov_arcmin = 5, radius_arcsec = 5) => {
    // console.log('Setting target:', target, aladinRef.current);
    if (!target || !aladinRef.current) return;
    // console.log('Setting target in Aladin:', target);
    // aladinRef.current.gotoPosition(parseFloat(target.meta_ra), parseFloat(target.meta_dec), 'gal');

    // Goto the target position
    aladinRef.current.gotoRaDec(parseFloat(target.meta_ra), parseFloat(target.meta_dec));
    // console.log('Target seted to:', target);

    // Set the field of view
    let fov_deg = (fov_arcmin / 60).toFixed(4);
    aladinRef.current.setFoV(fov_deg);

    // Draw marker
    if (targetOverlayRef.current) {
      aladinRef.current.removeOverlay(targetOverlayRef.current);
    }

    let radius_deg = (radius_arcsec / 3600).toFixed(4);

    targetOverlayRef.current = A.graphicOverlay({ color: '#33ff42', lineWidth: 2 });
    aladinRef.current.addOverlay(targetOverlayRef.current);
    targetOverlayRef.current.add(A.circle(target.meta_ra, target.meta_dec, radius_deg, { color: '#33ff42' }));

  }, []);

  const gotoRaDec = useCallback((ra, dec) => {
    if (aladinRef.current) {
      aladinRef.current.gotoRaDec(parseFloat(ra), parseFloat(dec));
    }
  }, []);

  const toggleMarkerVisibility = useCallback(() => {
    if (targetOverlayRef.current) {
      if (targetOverlayRef.current.isShowing) {
        targetOverlayRef.current.hide();
      } else {
        targetOverlayRef.current.show();
      }
    }
  }, []);

  const setImageSurvey = useCallback((survey) => {
    aladinRef.current?.setImageSurvey(survey);
  }, []);

  const toggleCatalogVisibility = useCallback((id) => {
    const catalog = catalogsRef.current?.[id];
    if (!catalog) return;

    if (catalog.isShowing) {
      catalog.hide();
    } else {
      catalog.show();
    }
  }, []);

  const addMarker = useCallback((ra, dec, options = {}) => {
    const overlay = aladinRef.current?.createOverlay();
    if (overlay) {
      overlay.addMarker(ra, dec, options);
      return overlay;
    }
    return null;
  }, []);


  const takeSnapshot = useCallback(() => {
    if (!aladinRef.current) return null;
    return aladinRef.current.exportAsPNG();
  }, []);


  const removeCatalog = useCallback((id) => {
    if (!aladinRef.current) return null;

    const catalog = catalogsRef.current?.[id];
    if (catalog) {
      catalog.removeAll();
      aladinRef.current.removeOverlay(catalog);
      delete catalogsRef.current[id];
    }
  }, []);


  const addCatalog = useCallback((id, sources = [], options = { color: '#33ff42', sourceSize: 8, shape: 'circle' }) => {
    // Catalog Option : https://cds-astro.github.io/aladin-lite/global.html#CatalogOptions
    if (!aladinRef.current) return null;

    if (catalogsRef.current?.[id]) {
      removeCatalog(id);
    }

    let catalog = A.catalog({ name: id, ...options });

    aladinRef.current.addCatalog(catalog);
    catalogsRef.current[id] = catalog;

    sources.forEach((source) => {
      catalog.addSources(A.source(source.meta_ra, source.meta_dec));
    });

    return catalog;
  }, []);

  // ---------------------------------------------------------------------
  // Mapas (overlays HiPS com opacidade)
  // ---------------------------------------------------------------------

  // Retorna o grupo de mapas da imagem base informada, no formato pronto
  // para a UI, ou null quando o survey não tem mapas.
  const getMapsForSurvey = useCallback((surveyId) => {
    if (!surveyId) return null;

    const group = maps.find(g => g.surveyIds?.includes(surveyId));
    if (!group) return null;

    if (group.requireGroup && !userGroups.includes(group.requireGroup)) return null;

    const options = group.categories.flatMap(cat =>
      cat.bands.map(band => ({
        mapId: `${group.surveyKey}_${cat.id}_${band.value}`,
        label: `${cat.label} ${band.label}`, // ex: "Fracdet g"
      }))
    );

    return { surveyKey: group.surveyKey, name: group.name, options };
  }, [userGroups]);

  // Aplica (ou substitui) o overlay de mapa do survey. O layer name é estável
  // por survey, então trocar de banda substitui a layer em vez de empilhar.
  const setMapOverlay = useCallback((surveyKey, mapId, opacity = 0.8) => {
    if (!aladinRef.current) return;

    const hips = mapsRef.current[mapId];
    if (!hips) return;

    const layer = aladinRef.current.setOverlayImageLayer(hips, `map-${surveyKey}`);
    layer.setOpacity(opacity);

    // Escolher o mapa já o torna visível (mesmo comportamento do "+ Surveys").
    mapLayersRef.current[surveyKey] = { layer, mapId, opacity, visible: true };
    setMapOverlays(prev => ({ ...prev, [surveyKey]: { mapId, opacity, visible: true } }));
  }, []);

  const setMapOpacity = useCallback((surveyKey, opacity) => {
    const entry = mapLayersRef.current[surveyKey];
    if (!entry) return;

    entry.opacity = opacity;
    // Com o mapa oculto só guarda o valor; a opacidade real segue 0 até reexibir.
    if (entry.visible) entry.layer.setOpacity(opacity);

    setMapOverlays(prev => ({ ...prev, [surveyKey]: { ...prev[surveyKey], opacity } }));
  }, []);

  // Mostrar/ocultar sem perder o mapa escolhido nem a opacidade. O idioma do
  // aladin-lite para isso é opacity 0 <-> valor anterior: mantém a posição na
  // pilha e o cache de tiles (sem re-download ao reexibir). Não usamos o
  // toggle() nativo porque ele guarda um prevOpacity interno que pode
  // dessincronizar do estado da aplicação.
  const setMapVisibility = useCallback((surveyKey, visible) => {
    const entry = mapLayersRef.current[surveyKey];
    if (!entry) return;

    entry.visible = visible;
    entry.layer.setOpacity(visible ? entry.opacity : 0);

    setMapOverlays(prev => ({ ...prev, [surveyKey]: { ...prev[surveyKey], visible } }));
  }, []);

  const removeMapOverlay = useCallback((surveyKey) => {
    if (!aladinRef.current) return;

    aladinRef.current.removeImageLayer(`map-${surveyKey}`);
    delete mapLayersRef.current[surveyKey];
    setMapOverlays(prev => {
      const next = { ...prev };
      delete next[surveyKey];
      return next;
    });
  }, []);

  return {
    containerRef,
    aladinRef,
    surveysRef,
    catalogsRef,
    mapsRef,
    isReady, // Importante: indica se o Aladin está pronto
    currentSurveyId, // ID do survey atual
    setFoV,
    setTarget,
    setImageSurvey,
    toggleCatalogVisibility,
    addMarker,
    toggleMarkerVisibility,
    takeSnapshot,
    addCatalog,
    gotoRaDec,
    mapOverlays,
    getMapsForSurvey,
    setMapOverlay,
    setMapOpacity,
    setMapVisibility,
    removeMapOverlay,
  };
}

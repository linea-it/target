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
  const targetOverlayRef = useRef(null);
  const [currentSurveyId, setCurrentSurveyId] = useState(null);

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

  const defaultTargets = {
    // "DES_DR2_IRG_LIneA": "02 32 44.09 -35 57 39.5",
    "DES_DR2_IRG_LIneA": "45.5695474 -19.0760449",
    // "RUBIN_FIRST_LOOK_UGRI": "12 26 53.27 +08 56 49.0",
    "RUBIN_FIRST_LOOK_UGRI": "184.940790 +5.51919840",
    // "LSST_DP02_IRG_LIneA": "04 08 29.07 -37 02 47.9"
    "LSST_DP02_IRG_LIneA": "239.215847 -47.5856227"
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

          if (targetOverlayRef.current) {
            // Já tem um target setado.

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
    });

    return () => {
      isCancelled = true;
      // if (containerRef.current) {
      //   containerRef.current.innerHTML = '';
      // }
      // console.log('Aladin instance cleaned up');
      // console.log('aladinRef.current to null');
      // aladinRef.current = null;
      // setIsReady(false);
    };
  }, [aladinParams]);

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

  return {
    containerRef,
    aladinRef,
    surveysRef,
    catalogsRef,
    isReady, // Importante: indica se o Aladin está pronto
    currentSurveyId, // ID do survey atual
    setFoV,
    setTarget,
    setImageSurvey,
    toggleCatalogVisibility,
    addMarker,
    toggleMarkerVisibility,
    takeSnapshot,
    addCatalog
  };
}

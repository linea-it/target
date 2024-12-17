'use client';
import React from 'react'
import Box from '@mui/material/Box';
import A from 'aladin-lite'

export default class Aladin extends React.Component {
  // Importante tentei criar o componente com Hooks mas não funcionou corretamente.
  // Usando Class based Component funcionou como esperado.
  // Acredito que seja pelo comportamento do didmount.
  // Aladin precisa que a div já exista antes da função ser chamada.
  //
  // Exemplos que usei como base:
  // https://blog.logrocket.com/complete-guide-react-refs/
  // https://legacy.reactjs.org/docs/hooks-effect.html
  //
  // Complete List with all Options for Aladin
  // https://aladin.cds.unistra.fr/AladinLite/doc/API/
  // Lista de Exemplos:
  // https://aladin.cds.unistra.fr/AladinLite/doc/API/examples/

  constructor(props) {
    // console.log("Aladin - constructor")
    super(props)

    // Cria um ID unico para div que vai receber o aladin
    // this.id = `aladin-container-${v4()}`
    this.id = `aladin-container`
    this.aladin = undefined
  }

  componentDidMount() {
    // https://cds-astro.github.io/aladin-lite/index.html
    A.init.then(() => {
      this.aladin = A.aladin(`#${this.id}`, { cooFrame: "ICRSd" })

      // https://aladin.cds.unistra.fr/AladinLite/doc/API/#image-layers
      // https://aladin.cds.unistra.fr/AladinLite/doc/API/
      this.aladin.setImageSurvey(this.aladin.createImageSurvey(
        "DES_DR2_IRG_LIneA",
        "DES DR2 IRG at LIneA",
        "https://scienceserver-dev.linea.org.br/secondary/images/coadd/hips_rgb/",
        "equatorial",
      ), { imgFormat: 'hips' })


      // DES DR2 Catalog HIPScat/HATS
      // https://aladin.cds.unistra.fr/AladinLite/doc/API/examples/catalog-hips-filter/
      // https://hipscat.cds.unistra.fr/HiPSCatService/I/345/gaia2/
      // https://aladin.cds.unistra.fr/AladinLite/doc/tutorials/interactive-finding-chart/
      // var hips = A.catalogHiPS(
      //   'https://scienceserver-dev.linea.org.br/secondary/catalogs/hats',
      //   {
      //     onClick: 'showTable',
      //     color: 'orange',
      //     name: 'DES DR2',
      //   });
      // this.aladin.addCatalog(hips);

      {/* aladin.setImageSurvey(
        aladin.createImageSurvey(
          "DSS blue band",
          "Color DSS blue HiPS",
          "http://alasky.cds.unistra.fr/DSS/DSS2-blue-XJ-S/",
          "equatorial",
          9,
          {imgFormat: 'fits'})
        ); // setting a custom HiPS */}

      //   // // Cria um catalogo com um unico source
      //   // this.drawCatalog()
      //   // // Centraliza a imagem na posição
      //   // this.goToPosition(this.props.ra, this.props.dec)
      // this.teste = this.aladin

      if (this.props.position) {
        this.gotoPosition()
      }

      if (this.props.catalog) {
        this.overlayCatalog()
      }
      if (this.props.radius) {
        this.overlayRadius();
      }
    })
  }

  componentWillUnmount() { }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // console.log("Aladin Update")
    if (this.props.position !== prevProps.position) {
      this.gotoPosition();
    }

    if (this.props.catalog !== prevProps.catalog) {
      this.overlayCatalog();
    }

    if (this.props.radius !== prevProps.radius) {
      this.overlayRadius();
    }
  }

  gotoPosition() {
    // Centraliza a imagem na posição
    // console.log("Aladin::New Position: ", this.props.position)
    this.aladin.gotoRaDec(this.props.position.ra, this.props.position.dec);
    this.aladin.setFoV(this.props.position.fov);
  }


  overlayCatalog() {
    console.log("Aladin::Overlay Catalog")
    // console.log(this.props.catalog)

    const cat = A.catalog({});
    this.aladin.addCatalog(cat);

    this.props.catalog.forEach((source) => {
      cat.addSources(A.source(source.ra, source.dec));
    });
  }

  // drawCircle(source, canvasCtx, viewParams) {
  //   canvasCtx.beginPath();
  //   canvasCtx.arc(source.x, source.y, source.data['size'], 0, 2 * Math.PI, false);
  //   canvasCtx.closePath();
  //   canvasCtx.strokeStyle = '#c38';
  //   canvasCtx.lineWidth = 3;
  //   canvasCtx.globalAlpha = 0.7;
  //   canvasCtx.stroke();
  // }

  // overlayRadius() {
  //   console.log("Aladin::Overlay Radius")
  //   const cat = A.catalog({ name: 'Cluster Radius', shape: this.drawCircle });

  //   const size = this.props.radius.radius * 60;

  //   cat.addSources(A.source(this.props.radius.ra, this.props.radius.dec, { size: size }));
  //   this.aladin.addCatalog(cat);
  // }

  overlayRadius() {
    // https://aladin.cds.unistra.fr/AladinLite/doc/API/examples/footprints/
    console.log("Aladin::Overlay Radius")

    let ra = parseFloat(this.props.ra);
    let dec = parseFloat(this.props.dec);
    let radius = parseFloat(this.props.radius.radius);
    let unit = this.props.radius.unit;

    // Tratar ra negativo
    if (ra < 0) {
      ra = ra + 360;
    }

    const overlay = A.graphicOverlay({
      color: '#ee2345',
      lineWidth: 3
    });
    this.aladin.addOverlay(overlay);

    // Conversao de unidades
    // if (unit === 'arcmin') {
    //   // Se estiver em minutos de arco dividir por 60
    //   radius = radius / 60;
    // }

    overlay.add(A.circle(ra, dec, radius));

  }

  render() {
    return (
      <>
        {typeof window !== "undefined" && (
          <Box
            id={this.id}
            sx={{
              // backgroundColor: 'darkgray',
              height: '100%',
              width: '100%',
            }}>
          </Box>
        )}
      </>
    )
  }
}

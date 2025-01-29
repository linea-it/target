import { createContext, useEffect, useState, useContext } from 'react'

export const RegisterCatalogContext = createContext({})

export const RegisterCatalogProvider = ({ children }) => {

  const emptyCatalog = {
    id: undefined,
    title: '',
    catalog_type: 'target',
    schema: '',
    table: '',
    description: '',
    columns: [],
  }

  const sampleCatalog = {
    id: 5,
    internal_name: 'sample_catalog',
    title: 'Sample Catalog',
    catalog_type: 'target',
    schema: 'mydb_glauber_costa',
    table: 'estrelas_brilhantes',
    description: 'A catalog of bright stars',
    columns: [
      {
        "id": 1,
        "std": false,
        "ucd": null,
        // "ucd": "meta.id;meta.main",
        "name": "coadd_object_id",
        "unit": "",
        "order": 1,
        "utype": "",
        "indexed": false,
        "datatype": "long",
        "arraysize": null,
        "principal": false,
        "description": "Unique identifier for the coadded objects",
      },
      {
        "id": 2,
        "std": false,
        "ucd": "pos.eq.ra;meta.main",
        "name": "ra",
        "unit": "deg",
        "order": 2,
        "utype": "",
        "indexed": false,
        "datatype": "double",
        "arraysize": null,
        "principal": false,
        "description": "Right ascension, with quantized precision for indexing (DELTAWIN_J2000 has full precision but not indexed)",
      },
      {
        "id": 3,
        "std": false,
        "ucd": "pos.eq.dec;meta.main",
        "name": "dec",
        "unit": "deg",
        "order": 3,
        "utype": "",
        "indexed": false,
        "datatype": "double",
        "arraysize": null,
        "principal": false,
        "description": "decl., with quantized precision for indexing (DELTAWIN_J2000 has full precision but not indexed)",
      },
      {
        "id": 4,
        "std": false,
        "ucd": "phot.mag;instr.det.psf;instr.sensitivity",
        "name": "wavg_mag_psf_g",
        "unit": "mag",
        "order": 4,
        "utype": "",
        "indexed": false,
        "datatype": "double",
        "arraysize": null,
        "principal": false,
        "description": "Weighted-average magnitude, of PSF ﬁt single-epoch detections",
      },
      {
        "id": 5,
        "std": false,
        "ucd": "meta.code;src",
        "name": "flags_g",
        "unit": "",
        "order": 5,
        "utype": "",
        "indexed": false,
        "datatype": "int",
        "arraysize": null,
        "principal": false,
        "description": "Flag describing cautionary advice about source extraction process (FLAGS < 4 for well-behaved objects)",
      },
      {
        "id": 6,
        "std": false,
        "ucd": "src.class.starGalaxy;meta.checksum;phot",
        "name": "extended_class_coadd",
        "unit": "",
        "order": 6,
        "utype": "",
        "indexed": false,
        "datatype": "int",
        "arraysize": null,
        "principal": false,
        "description": "0: high-conﬁdence stars; 1: candidate stars; 2: mostly gxs; 3: high-conﬁdence gxs; -9: No data; Sextractor photometry",
      },
      {
        "id": 7,
        "std": false,
        "ucd": "time.epoch",
        "name": "nepochs_g",
        "unit": "",
        "order": 7,
        "utype": "",
        "indexed": false,
        "datatype": "int",
        "arraysize": null,
        "principal": false,
        "description": "Number of epochs the source is detected in single-epoch images",
      }
    ]
  }

  const [catalog, setCatalog] = useState(emptyCatalog)

  const [activeStep, setActiveStep] = useState(0);

  // useEffect(() => {
  //   const catalog = localStorage.getItem('catalog')
  //   if (catalog) {
  //     setCatalog(JSON.parse(catalog))
  //   }
  // }, [])

  return (
    <RegisterCatalogContext.Provider value={{ catalog, setCatalog, activeStep, setActiveStep }}>
      {children}
    </RegisterCatalogContext.Provider>
  )
}

export const useRegisterCatalog = () => useContext(RegisterCatalogContext)

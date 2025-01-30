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
    is_completed: false,
    columns: [],
  }

  const [catalog, setCatalog] = useState(emptyCatalog)

  const [activeStep, setActiveStep] = useState(0);

  return (
    <RegisterCatalogContext.Provider value={{ catalog, setCatalog, activeStep, setActiveStep, emptyCatalog }}>
      {children}
    </RegisterCatalogContext.Provider>
  )
}

export const useRegisterCatalog = () => useContext(RegisterCatalogContext)

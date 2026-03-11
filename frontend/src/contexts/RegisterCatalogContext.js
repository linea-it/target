import { createContext, useEffect, useState, useContext } from 'react'

import { useAuth } from "./AuthContext";

export const RegisterCatalogContext = createContext({})

export const RegisterCatalogProvider = ({ children }) => {

  const { settings } = useAuth();

  const catalogType = settings?.enable_cluster ? "cluster" : "target";

  const emptyCatalog = {
    id: undefined,
    title: '',
    catalog_type: catalogType,
    schema: '',
    table: '',
    related_table: '',
    related_table_name: '',
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

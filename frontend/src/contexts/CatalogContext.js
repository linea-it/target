import { createContext, useEffect, useState, useContext } from 'react'

export const CatalogContext = createContext({})

export const CatalogProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({})


  return (
    <CatalogContext.Provider value={{ catalog, setCatalog }}>
      {children}
    </CatalogContext.Provider>
  )
}

export const useCatalog = () => useContext(CatalogContext)

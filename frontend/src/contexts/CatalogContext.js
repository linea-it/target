import { createContext, useEffect, useState, useContext } from 'react'

export const CatalogContext = createContext({})

export const CatalogProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({})
  const [selectedRecord, setSelectedRecord] = useState(undefined)


  return (
    <CatalogContext.Provider value={{ catalog, setCatalog, selectedRecord, setSelectedRecord }}>
      {children}
    </CatalogContext.Provider>
  )
}

export const useCatalog = () => useContext(CatalogContext)

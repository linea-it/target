import { createContext, useEffect, useState, useContext } from 'react'

export const EditCatalogContext = createContext({})

export const EditCatalogProvider = ({ children }) => {

  const [catalog, setCatalog] = useState()




  return (
    <EditCatalogContext.Provider value={{ catalog, setCatalog }}>
      {children}
    </EditCatalogContext.Provider>
  )
}

export const useEditCatalog = () => useContext(EditCatalogContext)

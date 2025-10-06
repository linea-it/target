import { createContext, useEffect, useState, useContext } from 'react'

export const CatalogContext = createContext({})

export const CatalogProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({})
  const [selectedRecord, setSelectedRecord] = useState(undefined)


  // Restaura o selectedRecord do sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedRecord')
    if (stored) {
      try {
        setSelectedRecord(JSON.parse(stored))
      } catch (err) {
        console.error('Erro ao restaurar selectedRecord do sessionStorage', err)
        sessionStorage.removeItem('selectedRecord')
      }
    }
  }, [])


  // Salva no sessionStorage toda vez que selectedRecord mudar
  useEffect(() => {
    if (selectedRecord) {
      sessionStorage.setItem('selectedRecord', JSON.stringify(selectedRecord))
    } else {
      sessionStorage.removeItem('selectedRecord')
    }
  }, [selectedRecord])

  return (
    <CatalogContext.Provider value={{ catalog, setCatalog, selectedRecord, setSelectedRecord }}>
      {children}
    </CatalogContext.Provider>
  )
}

export const useCatalog = () => useContext(CatalogContext)

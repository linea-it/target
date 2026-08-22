import { createContext, useEffect, useState, useContext } from 'react'

export const CatalogContext = createContext({})

export const CatalogProvider = ({ children }) => {
  const [catalog, setCatalog] = useState({})
  const [selectedRecord, setSelectedRecord] = useState(undefined)

  // Incrementado sempre que um registro é editado fora do grid (ex: comentário
  // salvo no AnnotationPanel), para o TargetDataGrid saber que precisa
  // recarregar as linhas visíveis.
  const [refreshGridToken, setRefreshGridToken] = useState(0)
  const refreshGrid = () => setRefreshGridToken((t) => t + 1)


  // Restaura o selectedRecord do sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedRecord')
    if (stored) {
      try {
        setSelectedRecord(JSON.parse(stored))
      } catch (err) {
        console.error('Error restoring selectedRecord from sessionStorage', err)
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
    <CatalogContext.Provider value={{ catalog, setCatalog, selectedRecord, setSelectedRecord, refreshGridToken, refreshGrid }}>
      {children}
    </CatalogContext.Provider>
  )
}

export const useCatalog = () => useContext(CatalogContext)

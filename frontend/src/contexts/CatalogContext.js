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

  // Último filterModel que o grid efetivamente usou com sucesso em
  // dataSource.getRows (TargetDataGrid) - fonte para o wizard de
  // materialização (issue #197), em vez de assinar um evento novo do grid.
  const [lastFilterModel, setLastFilterModel] = useState(undefined)


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

  // Restaura o lastFilterModel do sessionStorage. Necessário porque a
  // navegação entre páginas neste app usa <a href> puro (Button/IconButton
  // href=, sem Next Link), ou seja, é sempre um reload completo - o estado
  // em memória do CatalogProvider não sobrevive de /catalog/[schema]/[table]
  // até /catalog/[schema]/[table]/materialize, mesmo com o Provider num
  // layout compartilhado.
  useEffect(() => {
    const stored = sessionStorage.getItem('lastFilterModel')
    if (stored) {
      try {
        setLastFilterModel(JSON.parse(stored))
      } catch (err) {
        console.error('Error restoring lastFilterModel from sessionStorage', err)
        sessionStorage.removeItem('lastFilterModel')
      }
    }
  }, [])

  // Salva no sessionStorage toda vez que lastFilterModel mudar
  useEffect(() => {
    if (lastFilterModel) {
      sessionStorage.setItem('lastFilterModel', JSON.stringify(lastFilterModel))
    } else {
      sessionStorage.removeItem('lastFilterModel')
    }
  }, [lastFilterModel])

  return (
    <CatalogContext.Provider value={{ catalog, setCatalog, selectedRecord, setSelectedRecord, refreshGridToken, refreshGrid, lastFilterModel, setLastFilterModel }}>
      {children}
    </CatalogContext.Provider>
  )
}

export const useCatalog = () => useContext(CatalogContext)

import { createContext, useState, useContext } from 'react'

export const MaterializeCatalogContext = createContext({})

export const MaterializeCatalogProvider = ({ children }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [job, setJob] = useState(undefined)
  const [tableName, setTableName] = useState('')
  const [subsetFilter, setSubsetFilter] = useState(null)
  const [draftFilter, setDraftFilter] = useState(null)

  return (
    <MaterializeCatalogContext.Provider value={{ activeStep, setActiveStep, job, setJob, tableName, setTableName, subsetFilter, setSubsetFilter, draftFilter, setDraftFilter }}>
      {children}
    </MaterializeCatalogContext.Provider>
  )
}

export const useMaterializeCatalog = () => useContext(MaterializeCatalogContext)

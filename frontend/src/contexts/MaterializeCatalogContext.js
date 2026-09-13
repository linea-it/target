import { createContext, useState, useContext } from 'react'

export const MaterializeCatalogContext = createContext({})

export const MaterializeCatalogProvider = ({ children }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [job, setJob] = useState(undefined)
  const [tableName, setTableName] = useState('')

  return (
    <MaterializeCatalogContext.Provider value={{ activeStep, setActiveStep, job, setJob, tableName, setTableName }}>
      {children}
    </MaterializeCatalogContext.Provider>
  )
}

export const useMaterializeCatalog = () => useContext(MaterializeCatalogContext)

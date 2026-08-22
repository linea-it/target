import { api, parseQueryOptions } from "./Api";

export const userTables = (params) => {
    const queryParams = parseQueryOptions(params)
    return api.get("metadata/user_tables/", queryParams);
}

export const availableUserTables = () => {
    return api.get("metadata/user_tables/mydb_tables/");
}

export const registerUserTable = (data) => {
    return api.post("metadata/user_tables/", {
        ...data,
        schema: data.schema,
        name: data.table,
    });
}

export const updateUserTable = (data) => {
    return api.patch(`metadata/user_tables/${data.id}/`, data);
}

export const completeUserTableRegistration = ({ id }) => {
    return api.post(`metadata/user_tables/${id}/complete_registration/`);
}

export const deleteUserTable = (id) => {
    return api.delete(`metadata/user_tables/${id}/`);
}

export const pendingRegistration = () => {
    return api.get("metadata/user_tables/pending_registration/");
}

export const getMetadataBySchemaTable = ({ queryKey }) => {
    const params = queryKey[1]
    return api.get(`metadata/user_tables/`, { params: { schema: params.schema, name: params.table } })
}

export const getMetadataById = ({ tableId }) => {
    return api.get(`metadata/user_tables/${tableId}/`)
}

export const getTableColumn = (id) => {
    return api.get(`metadata/tables/${id}/columns/`)
}

export const updateTableColumn = (data) => {
    return api.patch(`metadata/columns/${data.id}/`, { ...data, ucd: data.ucd === null ? '' : data.ucd });
}

export const getTableData = (params) => {
    const queryParams = parseQueryOptions(params)
    return api.get(`metadata/user_tables/${params.tableId}/data/`, queryParams)
}

export const getMembersTableData = (params) => {
    // Igual a tabledata mais adiciona o filtro por cluster id.
    // Permiter utilizar todas as opções de paginação, ordenação e filtro.
    const queryParams = parseQueryOptions(params)
    queryParams.params[params.property_cross_id] = params.clusterId
    return api.get(`metadata/user_tables/${params.tableId}/data/`, queryParams)
}

export const getTableRowById = ({ queryKey }) => {
    const params = queryKey[1]
    return api.get(`metadata/user_tables/${params.tableId}/data/`, {
        params: {
            ...params.filters,
        }
    })
}

export const getClusterMembers = ({ tableId, property_cross_id, value }) => {
    return api.get(`metadata/user_tables/${tableId}/data/`, {
        params: {
            [property_cross_id]: value,
            pageSize: 1000
        }
    })
}



export const getNotebookHtml = ({ tableId, propertyId, recordId }) => {
    return api.get(`metadata/user_tables/${tableId}/notebook/`, {
        params: { [propertyId]: recordId },
        timeout: 120000,
    })
}

export const downloadClusterNotebook = async ({ tableId, propertyId, recordId }) => {
    const response = await api.get(`metadata/user_tables/${tableId}/notebook/download/`, {
        params: { [propertyId]: recordId },
        responseType: 'blob',
        timeout: 120000,
    })

    const clusterId = recordId || 'cluster'
    const blob = new Blob([response.data], { type: 'application/x-ipynb' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cluster_${clusterId}_analysis.ipynb`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}

export const createTableSettings = (data) => {
    return api.post("metadata/settings/", data);
}

export const updateTableSettings = (data) => {
    return api.patch(`metadata/settings/${data.id}/`, data);
}

export const getCatalogDiagnostic = ({ tableId }) => {
    return api.get(`metadata/user_tables/${tableId}/catalog_diagnostic/`)
}

export const downloadCatalogDiagnostic = async ({ tableId }) => {
    const response = await api.get(`metadata/user_tables/${tableId}/catalog_diagnostic/download/`, {
        responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'application/x-ipynb' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cluster_catalog_diagnostic_${tableId}.ipynb`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}

export const regenerateCatalogDiagnostic = ({ tableId }) => {
    return api.post(`metadata/user_tables/${tableId}/catalog_diagnostic/regenerate/`)
}

export const annotateTableRow = ({ tableId, rowId, ...data }) => {
    // data pode ter quality_flag e/ou comment. Só envia os campos presentes.
    return api.patch(`metadata/user_tables/${tableId}/rows/${rowId}/annotation/`, data);
}

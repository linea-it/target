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

export const getTableRowById = ({ queryKey }) => {
    const params = queryKey[1]
    return api.get(`metadata/user_tables/${params.tableId}/data/`, {
        params: {
            ...params.filters,
        }
    })
}

export const createTableSettings = (data) => {
    return api.post("metadata/settings/", data);
}

export const updateTableSettings = (data) => {
    return api.patch(`metadata/settings/${data.id}/`, data);
}


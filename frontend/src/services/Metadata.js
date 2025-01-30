import { api, parseQueryOptions } from "./Api";

export const userTables = ({ queryKey }) => {
    const params = parseQueryOptions(queryKey[1])
    return api.get("metadata/user_tables/", params);
}

export const availableUserTables = () => {
    return api.get("metadata/user_tables/mydb_tables/");
}

export const registerUserTable = (data) => {
    return api.post("metadata/user_tables/", data);
}

export const updateUserTable = (data) => {
    return api.patch(`metadata/user_tables/${data.id}/`, data);
}

export const deleteUserTable = (id) => {
    return api.delete(`metadata/user_tables/${id}/`);
}

export const pendingRegistration = () => {
    return api.get("metadata/user_tables/pending_registration/");
}

export const getMetadataBySchemaTable = ({ queryKey }) => {
    const params = queryKey[1]
    return api.get(`metadata/user_tables/`, { params: { ...params } })
}

export const getTableColumn = (id) => {
    return api.get(`metadata/tables/${id}/columns/`)
}

export const updateTableColumn = (data) => {
    return api.patch(`metadata/columns/${data.id}/`, { ...data, ucd: data.ucd === null ? '' : data.ucd });
}

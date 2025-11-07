import { api, parseQueryOptions } from "./Api";

export const userTables = (params) => {
  const queryParams = parseQueryOptions(params);
  return api.get("mydb/", queryParams);
};

export const dropTable = (table_name) => {
  return api.delete(`mydb/${table_name}/`);
};

export const userQuota = () => {
  return api.get("mydb/quota/");
};
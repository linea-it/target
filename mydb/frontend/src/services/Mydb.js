import { api, parseQueryOptions } from "./Api";

export const userTables = (params) => {
  const queryParams = parseQueryOptions(params);
  return api.get("mydb/", queryParams);
};

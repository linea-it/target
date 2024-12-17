import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(LocalizedFormat)

export const catalogs = [
  { id: 1, schema: 'mydb_glauber_costa', table: 'estrelas_brilhantes', name: 'My Target List', owner: 'glauber.costa', created_at: new Date(), type: 'single' },
  { id: 2, schema: 'mydb_glauber_costa', table: 'my_cluster_galaxies', name: 'My Cluster Galaxies', owner: 'glauber.costa', created_at: new Date(), type: 'cluster' },
]

export function getCatalogBySchemaTable(schema, table) {
  return catalogs.filter(catalog =>
    (catalog.schema === schema && catalog.table === table)
  )[0]
}

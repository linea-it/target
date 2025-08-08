'use client';
import React from "react";
import CatalogSettingsContainer from "@/containers/CatalogSettings";
import { EditCatalogProvider } from "@/contexts/EditCatalogContext";


export default function SettingsCatalog({ params }) {

  const { schema, table } = React.use(params)

  return (
    <EditCatalogProvider >
      <CatalogSettingsContainer schema={schema} table={table} />
    </EditCatalogProvider >
  );
}

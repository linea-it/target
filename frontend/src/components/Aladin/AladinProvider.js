'use client';

import { AladinContext } from './AladinContext';
import { useAladin } from './useAladin';

export function AladinProvider({ children, aladinParams = {}, userGroups = [], baseHost, default_survey }) {
  const aladin = useAladin(aladinParams, userGroups, baseHost, default_survey);

  return (
    <AladinContext.Provider value={aladin}>
      {children}
    </AladinContext.Provider>
  );
}

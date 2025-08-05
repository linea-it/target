'use client';

import { AladinContext } from './AladinContext';
import { useAladin } from './useAladin';

export function AladinProvider({ children, aladinParams = {}, userGroups = [], onReady = () => { } }) {
  const aladin = useAladin(aladinParams, userGroups, onReady);

  return (
    <AladinContext.Provider value={aladin}>
      {children}
    </AladinContext.Provider>
  );
}

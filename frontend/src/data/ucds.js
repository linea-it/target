export const ucds = [
  {
    label: 'ID',
    value: 'meta.id;meta.main',
  },
  {
    label: 'RA',
    value: 'pos.eq.ra;meta.main',
  },
  {
    label: 'Dec',
    value: 'pos.eq.dec;meta.main',
  },
  {
    label: 'Cross identification',
    value: 'meta.id.cross',
  },
  {
    label: 'Radius (arcmin)',
    value: 'phys.angSize;src',
    unit: 'arcmin',
    mandatory: false,
  },
]

export function filterUcdsByValue(value) {
  return ucds.filter(ucd => ucd.value === value);
}

export function getUcdLabel(value) {
  const item = ucds.find(ucd => ucd.value === value);
  return item ? (item.label || item.value) : null;
}


export const mandatoryUcds = [
  'meta.id;meta.main',
  'pos.eq.ra;meta.main',
  'pos.eq.dec;meta.main',
]


export const membersMandatoryUcds = [
  'meta.id;meta.main',
  'pos.eq.ra;meta.main',
  'pos.eq.dec;meta.main',
  'meta.id.cross'
]
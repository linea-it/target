// | Regra                     | Implementação                          |
// | ------------------------- | -------------------------------------- |
// | UCD obrigatório global    | `mandatory: true, types: []`           |
// | UCD obrigatório por tipo  | `mandatory: true, types: ['members']`  |
// | UCD opcional global       | `mandatory: false, types: []`          |
// | UCD opcional por tipo     | `mandatory: false, types: ['cluster']` |
export const ucds = [
  // Obrigatórios para todos os tipos de catalogos
  {
    label: 'ID',
    value: 'meta.id;meta.main',
    mandatory: true,
    types: []
  },
  {
    label: 'RA',
    value: 'pos.eq.ra;meta.main',
    mandatory: true,
    types: [],
    unit: 'deg'
  },
  {
    label: 'Dec',
    value: 'pos.eq.dec;meta.main',
    mandatory: true,
    types: [],
    unit: 'deg'
  },

  // Obrigatório só para catalogos do tipo "cluster"
  // {
  //   label: '',
  //   value: '',
  //   mandatory: true,
  //   types: ['cluster']
  // }

  // Opcional só para catalogos do tipo "cluster"
  {
    label: 'Radius (arcmin)',
    value: 'phys.angSize;src',
    mandatory: false,
    types: ['cluster'], // opcional, só para cluster
    unit: 'arcmin'
  },

  // Obrigatório só para catalogos do tipo "members"
  {
    label: 'Cross identification',
    value: 'meta.id.cross',
    mandatory: true,
    types: ['members'] // obrigatório só para "members"
  },

  // Opcionais para todos os tipos de catalogos
  // {
  //   label: 'Temperature',
  //   value: 'phys.temperature',
  //   mandatory: false,
  //   types: [] // opcional para todos
  // }
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
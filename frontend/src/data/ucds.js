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
    value: 'src.redshift'
  },
  {
    value: 'stat.error;src.redshift'
  },
  {
    value: 'stat.rank'
  },
  {
    value: 'meta.curation'
  }
]

export const mandatoryUcds = [
  'meta.id;meta.main',
  'pos.eq.ra;meta.main',
  'pos.eq.dec;meta.main',
]

export const targetColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
        field: 'ra',
        headerName: 'RA',
        width: 300,
    },
    {
        field: 'dec',
        headerName: 'Dec',
        width: 300,
    },
    {
        field: 'mag_auto_g',
        headerName: 'g',
        width: 300,
    },
]

export const targets = [
    { id: 1, ra: 34.5905748, dec: -9.29177774, mag_auto_g: 18 },
    { id: 2, ra: 342.136437, dec: -51.3264799, mag_auto_g: 22 },
    { id: 3, ra: 47.4473644, dec: -20.5809728, mag_auto_g: 22 },
]

export function getTargetById(targetId) {
    // Return a single cluster object
    return targets.filter(targets =>
        parseInt(targets.id) === parseInt(targetId)
    )[0]
}

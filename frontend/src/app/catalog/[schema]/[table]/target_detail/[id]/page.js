'use client'
import React from "react";
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
// import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
// import ShareIcon from '@mui/icons-material/Share';
import { getMetadataBySchemaTable, getTableRowById } from "@/services/Metadata";
import TargetDetailContainer from "@/containers/TargetDetail";
import Loading from "@/components/Loading";
import { useQuery } from '@tanstack/react-query'


export default function SingleTargetDetail({ params }) {
  // asynchronous access of `params.id`.
  const { schema, table, id } = React.use(params)

  const { isLoading: isLoadingTable, data: tableRecord } = useQuery({
    queryKey: ['metadataBySchemaTable', { schema, table }],
    queryFn: getMetadataBySchemaTable,
    select: (data) => data?.data.results[0],
    staleTime: 5 * 10000
  })

  const { isLoading: isLoadingRow, data: record } = useQuery({
    queryKey: ['tableRowById', { tableId: tableRecord?.id, filters: { [tableRecord?.property_id]: parseInt(id) } }],
    queryFn: getTableRowById,
    enabled: tableRecord !== undefined,
    select: (data) => data?.data.results[0],
    staleTime: 5 * 10000
  })

  if (isLoadingTable || isLoadingRow) {
    return <Loading isLoading={isLoadingTable || isLoadingRow} />
  }

  if (record === undefined) {
    return <div>Not found</div>
  }

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      // backgroundColor: 'gray',
      display: 'flex',
      flexDirection: 'column',
    }}
      p={4}
      pt={2}
    >
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href="/">
            {tableRecord?.schema}
          </Link>
          <Link color="inherit" href={`/catalog/${schema}/${table}`}>
            {tableRecord?.table}
          </Link>
          <Typography> {id} </Typography>
        </Breadcrumbs>
        <Stack direction="row" mt={2} spacing={1} sx={{
          alignItems: "center",
        }}>
          <IconButton href={`/catalog/${schema}/${table}`}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h5">
            Target {record?.id} - {record?.ra}, {record?.dec}
          </Typography>
          {/* <IconButton disabled>
            <ShareIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" size="large" disabled>Statistics</Button> */}
        </Stack>
      </Box>
      <TargetDetailContainer record={record} />
    </Box>
  );
}

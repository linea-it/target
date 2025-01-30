'use client'
import React from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import dayjs from "dayjs";
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import RegisterCatalogStepper from "./Stepper";
import RegisterCatalogBasicInformation from "./BasicInformation";
import RegisterCatalogColumnAssociation from "./ColumnAssociation";
import RegisterCatalogConfirmation from "./Confirmation";
import PendingConfirmation from "./PendingConfirmation";
import Loading from "@/components/Loading";
dayjs.extend(LocalizedFormat)
import { useRegisterCatalog } from "@/contexts/RegisterCatalogContext";
import { pendingRegistration, deleteUserTable } from "@/services/Metadata";


export default function RegisterCatalogContainer() {

  const { activeStep, setCatalog, emptyCatalog } = useRegisterCatalog();
  const [pendingCatalog, setPendingCatalog] = React.useState(undefined)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    setIsLoading(true)
    pendingRegistration()
      .then(res => {
        if (Object.keys(res.data).length > 0) {
          setPendingCatalog(res.data)
        }
      })
      .catch(res => {
        // TODO: Handle error
        console.log("Pending Registration Error", res)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const handleDiscard = () => {
    console.log('handleDiscard')
    setIsLoading(true)
    deleteUserTable(pendingCatalog.id)
      .then(res => {
        // Apos apagar o registro pendente, reseta o formulario.
        setCatalog(emptyCatalog)
      })
      .catch(res => {
        // TODO: Handle error
        console.log("Delete User Table Error", res)
      })
      .finally(() => {
        setPendingCatalog(undefined)
        setIsLoading(false)
      })

  }
  const handleContinue = () => {
    setCatalog(pendingCatalog)
    setPendingCatalog(undefined)
  }

  if (isLoading) {
    return <Loading isLoading={isLoading} />
  }

  if (pendingCatalog) {
    return <PendingConfirmation catalog={pendingCatalog} handleDiscard={handleDiscard} handleContinue={handleContinue} />
  }

  return (
    <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', pb: 4 }}>
      <Stack spacing={4} sx={{
        justifyContent: "flex-start",
        alignItems: "stretch",
        flexGrow: 1,
      }}>
        <Box mt={2}> <RegisterCatalogStepper /> </Box>
        <Box sx={{ flexGrow: 1 }}>
          {activeStep === 0 && (<RegisterCatalogBasicInformation />)}
          {activeStep === 1 && (<RegisterCatalogColumnAssociation />)}
          {activeStep === 2 && (<RegisterCatalogConfirmation />)}
        </Box>
      </Stack>
    </Container >
  );
}

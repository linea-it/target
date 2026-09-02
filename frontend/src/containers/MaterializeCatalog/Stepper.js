import * as React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { useMaterializeCatalog } from "@/contexts/MaterializeCatalogContext";

const steps = ['Preview SQL', 'Confirm', 'Progress'];

export default function MaterializeCatalogStepper() {
  const { activeStep } = useMaterializeCatalog();

  return (
    <Stepper activeStep={activeStep}>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

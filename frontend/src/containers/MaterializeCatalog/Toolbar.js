import React from "react";
import MuiToolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Box from '@mui/material/Box';

export default function MaterializeCatalogToolbar(props) {
  return (
    <MuiToolbar disableGutters>
      {props.onCancel && (
        <Button color="secondary" onClick={() => props.onCancel()}>Cancel</Button>
      )}
      {props.onPrev && (
        <Button variant="contained" color="secondary" onClick={() => props.onPrev()} sx={{ ml: 1 }}>
          Back
        </Button>
      )}
      <Box sx={{ flexGrow: 1 }} />
      {props.onNext && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => props.onNext()}
          disabled={props.nextDisabled}
        >
          {props.nextLabel || 'Next'}
        </Button>
      )}
    </MuiToolbar>
  );
}

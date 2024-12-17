import React from "react";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Box from '@mui/material/Box';

export default function RegisterCatalogToolbar(props) {
  return (
    <Toolbar>
      {!props.onPrev && <Button variant="contained" color="secondary" disabled>Prev</Button>}
      {props.onPrev && <Button variant="contained" color="secondary" onClick={() => props.onPrev()}>Prev</Button>}
      <Box sx={{ flexGrow: 1 }} />

      {props.onNext && <Button variant="contained" color="primary" onClick={() => props.onNext()}>Next</Button>}
      {props.onSubmit && <Button variant="contained" color="primary" onClick={() => props.onSubmit()}>Finish</Button>}
    </Toolbar>
  );
}

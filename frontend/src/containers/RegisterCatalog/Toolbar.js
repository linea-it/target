import React from "react";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Box from '@mui/material/Box';

export default function RegisterCatalogToolbar(props) {
  return (
    <Toolbar>
      {/* {!props.onPrev && <Button variant="contained" color="secondary" disabled>Prev</Button>} */}
      {props.onPrev && <Button variant="contained" color="secondary" onClick={() => props.onPrev()} disabled={!props.onPrev}>Prev</Button>}

      {props.onClear && (<Button variant="contained" color="secondary" onClick={() => props.onClear()} sx={{ mr: 1 }}>Clear Form</Button>)}
      <Box sx={{ flexGrow: 1 }} />

      {!props.onSubmit && <Button variant="contained" color="primary" onClick={() => props.onNext()} disabled={!props.onNext}>Next</Button>}

      {props.onSubmit && <Button variant="contained" color="primary" onClick={() => props.onSubmit()}>Finish</Button>}
    </Toolbar >
  );
}

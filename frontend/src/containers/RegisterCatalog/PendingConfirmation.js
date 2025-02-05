import React from "react";
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
export default function PendingConfirmation({ catalog, handleDiscard, handleContinue }) {

  return (
    <Dialog open={true}>
      <DialogTitle>{'Pending registration'}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {'Do you want to proceed with registration'}{' '}
          <strong>{catalog.schema}.{catalog.table}</strong>?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDiscard}>Discard</Button>
        <Button onClick={handleContinue}>Continue with registration</Button>
      </DialogActions>
    </Dialog>
  );
}

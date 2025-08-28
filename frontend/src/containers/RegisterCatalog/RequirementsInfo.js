import * as React from 'react';
import Alert from '@mui/material/Alert';

export default function RequirementsInfo() {
    return (
        <Alert severity="info">To register the catalog in the Target Viewer application, the ID, RA, and DEC columns are required. Please ensure these columns are present in your UserQuery result or customized table.</Alert>
    );
}

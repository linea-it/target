import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import LockIcon from '@mui/icons-material/Lock';
import Button from '@mui/material/Button';
export default function AccessRestricted({ message }) {

  return (
    <Box sx={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
    }}>
      <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h5" color="text.secondary" gutterBottom>
        Access Restricted
      </Typography>
      {message && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, textAlign: 'center' }}>
          {message}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIosIcon />}
        href="/"
        sx={{ mt: 1 }}
      >
        Back to Home
      </Button>
    </Box>
  )
}


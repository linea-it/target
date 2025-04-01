import * as React from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box'
import Footer from '@/components/Footer';
import Link from '@mui/material/Link';

export default function Tutorials() {
  return (
    <Container>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px - 496px)',
          padding: 2
        }}
      >
        <Grid container spacing={2} mt={4}>
          <Grid xs={12}>
            <Typography variant="h6">Contact</Typography>
            <Typography variant="body1" component="span">
              <p>Comments, questions, suggestions?</p>
              <p>
                Be welcome to open an issue on the{' '}
                <Link
                  href="https://github.com/linea-it/lsp_landing_page"
                  target="_blank"
                  rel="noreferrer"
                >
                  plataform’s repository
                </Link>{' '}
                on GitHub or contact our team.
              </p>
              <p>
                Technical support:{' '}
                <Link
                  href="mailto:helpdesk@linea.org.br"
                  target="_blank"
                  rel="noreferrer"
                >
                  helpdesk@linea.org.br
                </Link>
              </p>
            </Typography>
          </Grid>
        </Grid>
      </Box >
      <Footer />
    </Container>
  );
}

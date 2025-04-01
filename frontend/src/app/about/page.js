import * as React from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Box from '@mui/material/Box'
import Footer from '@/components/Footer';
import { useTheme } from '@mui/material/styles';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
export default function About() {
  return (
    <Container>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px - 496px)',
          padding: 2,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 2 }}>
              <Link color="inherit" href="/">
                Home
              </Link>
              <Typography color="textPrimary">About</Typography>
            </Breadcrumbs>
            <Typography variant="h6" sx={{ mb: 2 }}>
              About
            </Typography>
            <Typography variant="body1" component="span">

              The Target Viewer is a customized tool to visualize astronomical images based on a list of target objects previously defined by the user.

              Step-by-step:

              Create a new target list as a table in the user's MyDB space on {' '}
              <Link
                href="https://userquery.linea.org.br/"
                target="_blank"
                rel="noreferrer"
              >
                User Query
              </Link>.
              For the Target Viewer to be able to find the target images, the table must contain the columns objectId, ra, and dec.
              Click the "NEW CATALOG" button on the Target Viewer's HOME page and fill in the 3-step form to register the table as a target list. After submitting the form, the target list will appear in the menu on the HOME page.
            </Typography>
            <Divider sx={{ mt: 4, mb: 4 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              About Us
            </Typography>
            <Typography variant="body1">
              LIneA is a multi-user laboratory operated by a non-profit organization with financial support from the Brazilian Ministry of Science, Technology, and Innovation. Our mission is to support the Brazilian astronomical community with computing infrastructure and big data analysis expertise to provide technical conditions for participation in large astronomical surveys, such as SDSS, DES, and LSST.
            </Typography>
            <Typography variant="body1">
              <br />
              If you are a Portuguese speaker, please find more about LIneA on our {' '}
              <Link
                href="https://youtu.be/jC-k85tfd0Y"
                target="_blank"
                rel="noreferrer"
              >
                YouTube Channel
              </Link>{' '}
              and {' '}
              <Link
                href="http://linea.org.br/"
                target="_blank"
                rel="noreferrer"
              >
                Website
              </Link>.
            </Typography>
            <Divider sx={{ mt: 4, mb: 4 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Acknowledgements
            </Typography>
            <Typography variant="body1" component="blockquote" >
              This application has made use of "Aladin sky atlas" developed at CDS, Strasbourg Observatory, France
              →
              {' '}<Link
                href="https://ui.adsabs.harvard.edu/abs/2000A%26AS..143...33B/abstract"
                target="_blank"
                rel="noreferrer"
              >
                2000A&AS..143...33B
              </Link>{' '}
              (Aladin Desktop),
              {' '}<Link
                href="https://ui.adsabs.harvard.edu/abs/2014ASPC..485..277B/abstract"
                target="_blank"
                rel="noreferrer"
              >
                2014ASPC..485..277B
              </Link>{' '} (Aladin Lite v2), and
              {' '}<Link
                href="https://ui.adsabs.harvard.edu/abs/2022ASPC..532....7B/abstract"
                target="_blank"
                rel="noreferrer"
              >
                2022ASPC..532....7B
              </Link>{' '}
              (Aladin Lite v3).

            </Typography>
          </Grid>
        </Grid>
      </Box >
      <Footer />
    </Container>
  );
}

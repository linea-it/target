import React from 'react';
import Link from 'next/link'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import SupportImage from '@/components/SupportImage';
import Image from 'next/image';

function Footer() {

  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <Box sx={{ padding: '32px 0' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: '1000px',
            height: '0.5px',
            backgroundColor: '#ccc',
            margin: '0 auto',
            marginBottom: '96px',
          }}
        />
        <Grid container spacing={4} alignItems="center">
          <Grid item md={5}>
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 4 }}>
              <a
                href="https://www.linea.org.br/"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/linea-logo.png"
                  alt="LIneA logo"
                  width={145}
                  height={120}
                />
              </a>
              <Typography
                sx={{
                  fontSize: '24px',
                  color: '#000',
                  fontWeight: 'normal',
                  paddingLeft: '24px',
                }}
              >
                Associação Laboratório
                <br />
                Interinstitucional de
                <br />
                e-Astronomia LIneA
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ marginTop: '32px', fontSize: '14px', color: '#000', pl: 10 }}
            >
              Av. Pastor Martin Luther King Jr, 126 - Del Castilho
              <br />
              Nova América Offices, Torre 3000 / sala 817.
              <br />
              CEP: 20765-000 – Rio de Janeiro - RJ, Brasil
            </Typography>
            <Typography
              variant="body1"
              sx={{
                marginTop: '32px',
                background: '-webkit-linear-gradient(120deg, #0989cb, #31297f)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '16px',
                fontWeight: 'normal',
                textAlign: 'left',
                pl: 5,
                wordSpacing: '0.8rem',
              }}
            >
              #PeloFuturoDaCiência &nbsp; #PeloFuturoDaAstronomia
            </Typography>
          </Grid>

          <Grid item xs={12} md={1}>
            <Box
              sx={{
                height: '110px',
                width: '0.5px',
                backgroundColor: '#ccc',
                margin: '0 auto',
                position: 'relative',
                top: '-80px',
              }}
            />
          </Grid>

          <Grid item md={6} sx={{ textAlign: 'left', mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#a3a3a3', fontSize: '.9rem' }}>
                Support:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                {[{
                  href: "https://www.linea.org.br/inct#inct",
                  src: "/inct-logo.png",
                  alt: "INCT"
                }, {
                  href: "https://www.gov.br/capes/pt-br",
                  src: "/capes-logo.png",
                  alt: "CAPES"
                }, {
                  href: "https://www.gov.br/cnpq/pt-br",
                  src: "/cnpq-logo.png",
                  alt: "CNPq"
                }, {
                  href: "https://www.faperj.br",
                  src: "/faperj-logo.png",
                  alt: "FAPERJ"
                }, {
                  href: "http://www.finep.gov.br",
                  src: "/finep-logo.png",
                  alt: "FINEP"
                }].map(({ href, src, alt }) => (
                  <Box key={alt} sx={{ margin: '0 8px' }}>
                    <SupportImage href={href} src={src} alt={alt} />
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 6 }}>
              <Typography variant="body1">
                e-mail:{' '}
                <Link
                  href="mailto:secretaria@linea.org.br"
                  sx={{
                    textDecoration: 'none',
                    color: '#000',
                    mr: '16px',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  secretaria@linea.org.br
                </Link>
              </Typography>
              <Typography variant="body1" ml={2}>
                tel:{' '}
                <Link
                  href="tel:+5521969379224"
                  sx={{
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    color: '#000',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  +55 21 96937 9224
                </Link>
              </Typography>
            </Box>

            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2.5 }}>
              <IconButton
                href="https://www.linkedin.com/company/linea-astronomia"
                target="_blank"
                sx={{
                  color: '#283664',
                  border: '1px solid #283664',
                  borderRadius: '50%',
                  padding: '8px',
                }}
              >
                <LinkedInIcon sx={{ color: '#283664', '&:hover': { color: '#0077B5' } }} />
              </IconButton>
              <IconButton
                href="https://x.com/linea_org"
                target="_blank"
                sx={{
                  color: '#283664',
                  border: '1px solid #283664',
                  borderRadius: '50%',
                  padding: '8px',
                }}
              >
                <XIcon sx={{ color: '#283664', '&:hover': { color: '#1DA1F2' } }} />
              </IconButton>
              <IconButton
                href="https://www.instagram.com/linea_org/"
                target="_blank"
                sx={{
                  color: '#283664',
                  border: '1px solid #283664',
                  borderRadius: '50%',
                  padding: '8px',
                }}
              >
                <InstagramIcon sx={{ color: '#283664', '&:hover': { color: '#E1306C' } }} />
              </IconButton>
              <IconButton
                href="https://www.youtube.com/@linea_org"
                target="_blank"
                sx={{
                  color: '#283664',
                  border: '1px solid #283664',
                  borderRadius: '50%',
                  padding: '8px',
                }}
              >
                <YouTubeIcon sx={{ color: '#283664', '&:hover': { color: '#FF0000' } }} />
              </IconButton>
              <IconButton
                href="https://www.facebook.com/linea.org"
                target="_blank"
                sx={{
                  color: '#283664',
                  border: '1px solid #283664',
                  borderRadius: '50%',
                  padding: '8px',
                }}
              >
                <FacebookIcon sx={{ color: '#283664', '&:hover': { color: '#1877F2' } }} />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        <Grid item md={12}>
          <Typography
            variant="body2"
            sx={{ mt: '40px', textAlign: 'center', color: '#a3a3a3', fontSize: '0.875rem' }}
          >
            LIneA - {currentYear} - All rights reserved |{' '}
            <Link
              href="https://www.linea.org.br/politica-de-privacidade"
              target="_blank"
              sx={{
                color: '#000 !important',
              }}
            >
              Privacy Policy
            </Link>
          </Typography>
        </Grid>
      </Box>
    </footer>
  );
}

export default Footer;

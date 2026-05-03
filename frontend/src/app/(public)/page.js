'use client';
import React from "react";
import Container from '@mui/material/Container';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import LandingBodyCanvas from '@/components/Landing/LandingBodyCanvas';
import LandingBodyTarget from '@/components/Landing/LandingBodyTarget';
import LandingBannerCanvas from '@/components/Landing/LandingBannerCanvas';
import LandingBannerTarget from '@/components/Landing/LandingBannerTarget';

export default function LandingPage() {
  const { settings } = useAuth();
  const appTitle = settings?.application_title || settings?.application_name || 'Science Platform';
  const isCanvas = settings?.enable_cluster === true || settings?.enable_cluster === 'true' || settings?.enable_cluster === 1;

  return (
    <React.Fragment>
      {isCanvas ? <LandingBannerCanvas appTitle={appTitle} /> : <LandingBannerTarget appTitle={appTitle} />}

      <Container>
        {isCanvas ? <LandingBodyCanvas /> : <LandingBodyTarget />}
        <Footer />
      </Container>
    </React.Fragment>
  );
}

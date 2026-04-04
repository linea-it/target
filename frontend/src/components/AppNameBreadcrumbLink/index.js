"use client";

import React from 'react';
import Link from '@mui/material/Link';
import { useAuth } from '@/contexts/AuthContext';

export default function AppNameBreadcrumbLink() {
    const { settings } = useAuth();
    const label = settings?.application_name || settings?.application_title || 'Application';

    return (
        <Link color="inherit" href="/">
            {label}
        </Link>
    );
}
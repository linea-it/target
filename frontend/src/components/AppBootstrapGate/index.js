"use client";

import React from "react";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from "@/contexts/AuthContext";

export default function AppBootstrapGate({ children }) {
    const { settingsLoaded } = useAuth();

    if (!settingsLoaded) {
        return (
            <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                open={true}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        );
    }

    return children;
}

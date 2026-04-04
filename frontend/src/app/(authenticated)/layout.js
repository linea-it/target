"use client";

import React, { useEffect } from "react";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import MainContainer from "@/containers/MainContainer";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthenticatedLayout({ children }) {
    const { user, settings, authResolved } = useAuth();

    useEffect(() => {
        if (authResolved && !user) {
            window.location.href = settings?.login_url || '/';
        }
    }, [authResolved, user, settings]);

    if (!authResolved || !user) {
        return (
            <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                open={true}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        );
    }

    return <MainContainer>{children}</MainContainer>;
}

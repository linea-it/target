import React from "react";
import Box from '@mui/material/Box';
import Header from "@/components/Header";
import TitleManager from "@/components/TitleManager";

export default function PublicLayout({ children }) {
    return (
        <React.Fragment>
            <Header />
            <TitleManager />
            <Box
                component='main'
                sx={{
                    minHeight: 'calc(100vh - 64px)',
                }}
            >
                {children}
            </Box>
        </React.Fragment>
    );
}

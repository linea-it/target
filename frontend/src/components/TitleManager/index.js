"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function TitleManager() {
    const { settings } = useAuth();

    useEffect(() => {
        if (settings?.application_title) {
            document.title = settings.application_title;
        }
    }, [settings]);

    return null;
}
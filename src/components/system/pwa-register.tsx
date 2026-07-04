"use client";

import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register(`${basePath}/sw.js`, {
      scope: `${basePath}/`,
    }).catch(() => {
      // Keep the app usable even if SW registration fails.
    });
  }, []);

  return null;
}

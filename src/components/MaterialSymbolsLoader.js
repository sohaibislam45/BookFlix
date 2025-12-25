'use client';

import { useEffect } from 'react';

export default function MaterialSymbolsLoader() {
  useEffect(() => {
    // Check if link already exists
    const existingLink = document.querySelector('link[href*="Material+Symbols+Outlined"]');
    if (existingLink) return;

    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);

  return null;
}


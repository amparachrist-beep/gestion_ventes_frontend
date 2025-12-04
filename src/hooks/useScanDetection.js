// src/hooks/useScanDetection.js
import { useEffect, useState } from "react";

export const useScanDetection = ({ onScan }) => {
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // Si on est dans un input (ex: recherche manuelle), on ne veut pas intercepter le scan global
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Si le délai entre deux touches est trop long (> 100ms), on reset le buffer (c'est probablement une saisie manuelle lente)
      if (buffer.length > 0 && timeDiff > 100) {
        buffer = "";
      }

      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) { // Minimum 3 caractères pour un code barre
          e.preventDefault();
          onScan(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        // On ajoute les caractères imprimables seulement
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan]);
};
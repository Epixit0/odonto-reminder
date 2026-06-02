"use client";

import { useEffect } from "react";

export function useKeyboard(shortcuts) {
  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;

      for (const { key, ctrlKey, handler } of shortcuts) {
        if ((ctrlKey ? ctrl : e.key === key) && 
            (ctrlKey ? e.key.toLowerCase() === key.toLowerCase() : true)) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

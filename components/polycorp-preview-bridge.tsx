"use client";

import { useEffect } from "react";

const PREVIEW_QUERY_PARAMETER = "__polycorp_preview";
const PREVIEW_RELOAD_QUERY_PARAMETER = "__polycorp_preview_reload";
const PREVIEW_READY_MESSAGE_TYPE = "polycorp:website-preview-ready";
const PREVIEW_BRIDGE_VERSION = 1;

function afterNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export function PolycorpPreviewBridge() {
  useEffect(() => {
    if (window.parent === window) return;

    const url = new URL(window.location.href);
    const token = url.searchParams.get(PREVIEW_RELOAD_QUERY_PARAMETER);
    if (url.searchParams.get(PREVIEW_QUERY_PARAMETER) !== "1" || !token) {
      return;
    }

    let cancelled = false;

    const notifyParent = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // A failed webfont must not leave an otherwise rendered page hidden.
      }

      await afterNextPaint();
      if (cancelled) return;

      window.parent.postMessage(
        {
          type: PREVIEW_READY_MESSAGE_TYPE,
          version: PREVIEW_BRIDGE_VERSION,
          token,
        },
        "*",
      );
    };

    const handleLoad = () => void notifyParent();
    if (document.readyState === "complete") {
      void notifyParent();
    } else {
      window.addEventListener("load", handleLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return <span hidden aria-hidden="true" data-polycorp-preview-bridge="1" />;
}

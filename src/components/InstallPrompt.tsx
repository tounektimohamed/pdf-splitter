"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const iOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: unknown }).MSStream;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  const nav = navigator as unknown as {
    standalone?: boolean;
    userAgent?: string;
  };
  return typeof nav.standalone === "boolean" && nav.standalone === true;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (dismissed) return;
      setDeferred(e as BeforeInstallPromptEvent);
      if (!isStandalone()) setShowPopup(true);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setShowPopup(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    const timer = setTimeout(
      () => {
        if (cancelled || dismissed) return;
        if (!deferred && !isStandalone()) setShowPopup(true);
      },
      isStandalone() ? 0 : iOS ? 5000 : 8000
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [deferred, dismissed]);

  if (installed || !showPopup) {
    return (
      <div
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white shadow-lg shadow-primary/30 btn-primary text-sm font-medium cursor-pointer opacity-0 pointer-events-none"
        aria-hidden="true"
        style={{ display: "none" }}
      >
        <span className="text-base">📱</span> Installer l&apos;app
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-md animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl shadow-black/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl shadow-lg shadow-primary/30">
            📱
          </div>
          <div className="flex-1 min-w-0">
            {iOS ? (
              <div>
                <h3 className="font-semibold text-lg leading-tight mb-1">
                  Installer PDF Toolbox
                </h3>
                <p className="text-sm text-muted leading-snug">
                  Pour installer : touchez le bouton{" "}
                  <span className="font-semibold text-foreground">Partager</span>{" "}
                  puis{" "}
                  <span className="font-semibold text-foreground">
                    « Sur l&apos;écran d&apos;accueil »
                  </span>
                  .
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-lg leading-tight mb-1">
                  Installer PDF Toolbox
                </h3>
                <p className="text-sm text-muted leading-snug">
                  Installez l&apos;application pour un accès rapide et un usage
                  hors ligne. 100% gratuit.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setShowPopup(false);
              setDismissed(true);
            }}
            className="flex-1 px-4 py-2 rounded-xl bg-muted/10 text-foreground font-medium text-sm hover:bg-muted/20 transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={async () => {
              if (deferred) {
                await deferred.prompt();
                const choice = await deferred.userChoice;
                if (choice.outcome === "accepted") {
                  setInstalled(true);
                  setShowPopup(false);
                } else {
                  setShowPopup(false);
                }
              } else {
                setShowPopup(false);
                setDismissed(true);
              }
            }}
            className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-white font-medium text-sm btn-primary text-center cursor-pointer"
          >
            {deferred ? "Installer" : "Compris"}
          </button>
        </div>
      </div>
    </div>
  );
}
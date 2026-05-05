"use client";

import { useEffect, useState } from "react";
import { AppIntro } from "@/components/brand/app-intro";
import { RefreshLoader } from "@/components/brand/refresh-loader";

const INTRO_SESSION_KEY = "answerrank_intro_seen";

type LoadPhase = "checking" | "intro" | "refresh" | "content";

type AppLoadGateProps = {
  children: React.ReactNode;
};

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    return;
  }
}

function readIntroSeen() {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getNavigationIsReload() {
  if (typeof window.performance?.getEntriesByType !== "function") {
    return false;
  }

  const entry = window.performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;

  return entry?.type === "reload";
}

export function AppLoadGate({ children }: AppLoadGateProps) {
  const [phase, setPhase] = useState<LoadPhase>("checking");

  useEffect(() => {
    const timers: number[] = [];

    const queue = (callback: () => void, delay = 0) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };

    const search = new URLSearchParams(window.location.search);
    const forceIntro = search.get("intro") === "1";
    const forceRefreshLoader = search.get("refreshLoader") === "1";
    const introSeen = readIntroSeen();
    const reducedMotion = prefersReducedMotion();
    const isReload = getNavigationIsReload();

    if (forceIntro) {
      queue(() => setPhase("intro"));
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (forceRefreshLoader) {
      queue(() => setPhase("refresh"));
      queue(() => setPhase("content"), reducedMotion ? 120 : 760);
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (introSeen === null) {
      queue(() => setPhase("content"));
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (!introSeen) {
      if (reducedMotion) {
        markIntroSeen();
        queue(() => setPhase("content"), 120);
        return () => {
          timers.forEach((timer) => window.clearTimeout(timer));
        };
      }

      queue(() => setPhase("intro"));
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (isReload) {
      queue(() => setPhase("refresh"));
      queue(() => setPhase("content"), reducedMotion ? 120 : 760);
      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    queue(() => setPhase("content"));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const handleIntroComplete = () => {
    markIntroSeen();
    setPhase("content");
  };

  return (
    <>
      {phase === "intro" ? <AppIntro onComplete={handleIntroComplete} /> : null}
      {phase === "refresh" ? <RefreshLoader /> : null}
      <div
        className={`transition-opacity duration-500 ${phase === "content" ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {children}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AppIntro } from "@/components/brand/app-intro";

const INTRO_SESSION_KEY = "answerrank_intro_seen";

type IntroGateProps = {
  children: React.ReactNode;
};

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    return;
  }
}

export function IntroGate({ children }: IntroGateProps) {
  const [phase, setPhase] = useState<"checking" | "intro" | "content">(
    "checking",
  );

  useEffect(() => {
    const commitPhase = (
      nextPhase: "checking" | "intro" | "content",
      delay = 0,
    ) => window.setTimeout(() => setPhase(nextPhase), delay);

    try {
      const seenIntro =
        window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true";

      if (seenIntro) {
        commitPhase("content");
        return;
      }
    } catch {
      commitPhase("content");
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      markIntroSeen();
      commitPhase("content", 120);
      return;
    }

    commitPhase("intro");
  }, []);

  const handleComplete = () => {
    markIntroSeen();
    setPhase("content");
  };

  return (
    <>
      {phase === "intro" ? <AppIntro onComplete={handleComplete} /> : null}
      <div
        className={`transition-opacity duration-500 ${phase === "content" ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {children}
      </div>
    </>
  );
}

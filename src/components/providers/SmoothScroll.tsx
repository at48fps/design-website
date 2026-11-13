"use client";

import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/** Keeps ScrollTrigger in sync with Lenis' virtual scroll position. */
function ScrollTriggerSync() {
  useLenis(ScrollTrigger.update);
  return null;
}

/**
 * Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Access the instance anywhere with `useLenis()` from "lenis/react".
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    // Always open on the landing screen: no scroll restore on refresh / back-forward.
    ScrollTrigger.clearScrollMemory("manual");
    window.scrollTo(0, 0);
    const toTop = () => window.scrollTo(0, 0);
    window.addEventListener("beforeunload", toTop);
    requestAnimationFrame(() =>
      lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true }),
    );

    // Read the instance on every tick: it is created after this effect runs.
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      window.removeEventListener("beforeunload", toTop);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false, lerp: 0.1 }}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}

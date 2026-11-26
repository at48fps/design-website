"use client";

import { useEffect, useRef, useState } from "react";
import { filmConfig } from "./film.config";
import { ATLAS_FONTS } from "./filmAtlas";
import { FilmStripScene } from "./FilmStripScene";
import { filmSans, filmSerif } from "./fonts";
import { INITIAL_FILM_FRAMES } from "./frames";
import { FrameLightbox } from "./FrameLightbox";
import styles from "./FilmStripPage.module.scss";

/**
 * "iara.sharma": headline + copy, and below it (in its own box, so the two can
 * never overlap) the 35mm film strip. Scrolling the page runs the strip; drag
 * it sideways, hover a frame to light it, click a frame (or the copy) to open
 * its story. The capabilities section sends scroll progress to [data-scrub].
 */
export function FilmStripPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FilmStripScene | null>(null);
  const [activeFrame, setActiveFrame] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const frames = INITIAL_FILM_FRAMES;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Frame text is drawn with the self-hosted fonts.
    ATLAS_FONTS.serif = filmSerif.style.fontFamily;
    ATLAS_FONTS.sans = filmSans.style.fontFamily;

    let scene: FilmStripScene;
    try {
      scene = new FilmStripScene(stage, frames, {
        onActiveFrameChange: setActiveFrame,
        onSelectFrame: setSelected,
        onContextLost: setWebglUnavailable,
      });
    } catch {
      // No WebGL at all: show the plain frame grid (deferred, not during the effect).
      const id = requestAnimationFrame(() => setWebglUnavailable(true));
      return () => cancelAnimationFrame(id);
    }
    sceneRef.current = scene;
    const onScrub = (e: Event) => {
      const p = (e as CustomEvent<number>).detail;
      scene.setScrollPx(p * filmConfig.scrollLength * window.innerHeight);
    };
    stage.addEventListener("scrub", onScrub);
    return () => {
      stage.removeEventListener("scrub", onScrub);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [frames]);

  return (
    <div className={styles.page}>
      <div className={styles.copy}>
        <h2 className={`${styles.title} ${filmSerif.className}`}>{filmConfig.title}</h2>
        <p className={`${styles.body} ${filmSans.className}`}>
          <button type="button" className={styles.bodyButton} onClick={() => setSelected(activeFrame)}>
            {filmConfig.body}
          </button>
        </p>
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        data-scrub
        aria-label="Interactive 3D scrolling 35mm filmstrip gallery"
      >
        {webglUnavailable && (
          <div className={styles.fallback}>
            {frames.map((frame, i) => (
              <button key={frame.id} type="button" onClick={() => setSelected(i)} className={styles.fallbackItem}>
                {/* eslint-disable-next-line @next/next/no-img-element -- no-WebGL thumbnails */}
                <img src={frame.imageUrl} alt={frame.title} />
                <span>{frame.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <FrameLightbox
        frames={frames}
        selectedIndex={selected}
        onClose={() => setSelected(null)}
        onNavigate={(i) => {
          setSelected(i);
          sceneRef.current?.jumpToFrame(i);
        }}
      />
    </div>
  );
}

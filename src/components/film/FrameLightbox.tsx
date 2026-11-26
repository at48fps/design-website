"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FilmFrameItem } from "./frames";
import { filmMono, filmSans, filmSerif } from "./fonts";
import styles from "./FrameLightbox.module.scss";

type Props = {
  frames: FilmFrameItem[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
};

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

/**
 * Full-screen story of one frame (opened by clicking a frame on the strip).
 * Rendered into <body> so the pinned, transformed story section can't clip it.
 */
export function FrameLightbox({ frames, selectedIndex, onClose, onNavigate }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const frame = selectedIndex !== null ? frames[selectedIndex] : null;

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((selectedIndex + 1) % frames.length);
      if (e.key === "ArrowLeft") onNavigate((selectedIndex - 1 + frames.length) % frames.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, frames.length, onClose, onNavigate]);

  if (selectedIndex === null || !frame) return null;
  const prev = () => onNavigate((selectedIndex - 1 + frames.length) % frames.length);
  const next = () => onNavigate((selectedIndex + 1) % frames.length);

  return createPortal(
    <div
      className={`${styles.backdrop} ${filmSans.className}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Frame ${frame.code}: ${frame.title}`}
      data-lenis-prevent
      onClick={onClose}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close frame story" className={styles.close}>
          <Icon d="M18 6 6 18M6 6l12 12" />
        </button>

        <div className={styles.visual}>
          {failed !== frame.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- full-size frame photo in a modal
            <img
              src={frame.imageUrl}
              alt={`${frame.title} — ${frame.subtitle}`}
              onError={() => setFailed(frame.imageUrl)}
              className={styles.photo}
            />
          ) : (
            <div className={styles.fallback} style={{ backgroundColor: frame.accentColor }}>
              <span className={filmSerif.className}>{frame.title}</span>
            </div>
          )}
          <div className={styles.arrows}>
            <button type="button" onClick={prev} aria-label="Previous frame" className={styles.arrow}>
              <Icon d="m15 18-6-6 6-6" />
            </button>
            <button type="button" onClick={next} aria-label="Next frame" className={styles.arrow}>
              <Icon d="m9 18 6-6-6-6" />
            </button>
          </div>
        </div>

        <div className={styles.story}>
          <div className={styles.meta}>
            <span className={`${styles.count} ${filmMono.className}`}>
              Frame {String(selectedIndex + 1).padStart(2, "0")} / {String(frames.length).padStart(2, "0")}
            </span>
            <span aria-hidden>·</span>
            <span>{frame.code}</span>
            <span aria-hidden>·</span>
            <span>{frame.year}</span>
          </div>
          <h2 className={`${styles.title} ${filmSerif.className}`}>{frame.title}</h2>
          <p className={styles.subtitle}>{frame.subtitle}</p>
          <p className={styles.text}>{frame.story}</p>
          <div className={styles.specs}>
            <span>{frame.filmStock}</span>
            <span aria-hidden>·</span>
            <span>{frame.lens}</span>
            <span aria-hidden>·</span>
            <span>{frame.location}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

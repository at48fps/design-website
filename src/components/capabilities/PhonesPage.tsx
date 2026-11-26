"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { capabilitiesConfig as cfg } from "./capabilities.config";
import {
  GeniePhonesScene,
  MARGIN_X,
  MARGIN_Y,
  MODEL_CX,
  MODEL_H,
  MODEL_W,
} from "./GeniePhonesScene";
import styles from "./CapabilitiesSection.module.scss";

const phone = cfg.phones;

// Layout box = phone bodies edge to edge, in prototype frame px.
const L0 = Math.min(...phone.list.map((p) => p.cx - MODEL_CX * p.s));
const R0 = Math.max(...phone.list.map((p) => p.cx + (MODEL_W - MODEL_CX) * p.s));
const T0 = Math.min(...phone.list.map((p) => p.top));
const B0 = Math.max(...phone.list.map((p) => p.top + MODEL_H * p.s));
const BW = R0 - L0, BH = B0 - T0;
const centre = phone.list.find((p) => p.ring === 0)!;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

// Cast shadows: the centre phone shadows both neighbours, the inner pair cast outward.
const DROP = [
  "drop-shadow(0 18px 26px rgba(40,10,35,.30)) drop-shadow(0 4px 8px rgba(40,10,35,.16))",
  "drop-shadow(SIDE 14px 22px rgba(20,20,40,.26)) drop-shadow(0 3px 6px rgba(20,20,40,.14))",
  "drop-shadow(0 10px 18px rgba(20,20,20,.18))",
];

/**
 * "Agentic commerce" with five 3D POPgenie phones, laid out and animated like
 * the prototype (index.html). The centre phone rises in with the page and stays
 * fully opaque; on the next scroll (step `spread`) the inner pair, then the
 * outer pair, slide out from behind it, growing, untilting and fading in.
 * The phones lean toward the mouse. No WebGL: a flat image of all five.
 */
export function PhonesPage({ title, body }: { title: string; body: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let scene: GeniePhonesScene;
    try {
      scene = new GeniePhonesScene(root, () => setFlat(true));
    } catch {
      const id = requestAnimationFrame(() => setFlat(true));
      return () => cancelAnimationFrame(id);
    }
    return () => scene.dispose();
  }, []);

  return (
    <div className={styles.intro}>
      <h2 className={styles.introTitle} data-lift>{title}</h2>
      <p className={styles.introBody} data-lift>{body}</p>
      <div
        ref={rootRef}
        className={styles.genie}
        data-rise
        data-flat={flat || undefined}
        role="img"
        aria-label={phone.alt}
        style={{ width: phone.width, aspectRatio: `${BW} / ${BH}` } as CSSProperties}
      >
        {phone.list.map((p) => {
          const w = MODEL_W * p.s, h = MODEL_H * p.s;
          const bw = w * (1 + 2 * MARGIN_X), bh = h * (1 + 2 * MARGIN_Y);
          const fx = p.cx - MODEL_CX * p.s - MARGIN_X * w, fy = p.top - MARGIN_Y * h;
          const ring = p.ring === 0 ? null : phone.rings[p.ring];
          return (
            <div
              key={p.id}
              data-phone
              className={styles.geniePhone}
              style={{
                left: pct(fx - L0, BW),
                top: pct(fy - T0, BH),
                width: pct(bw, BW),
                height: pct(bh, BH),
              }}
            >
              <div
                data-move
                className={`${styles.genieMove} ${ring ? styles.genieSide : ""}`}
                {...(ring && {
                  // Starts behind the centre phone (share of its own box width).
                  "data-spread": ((centre.cx - p.cx) / bw) * 100,
                  "data-spread-at": ring.at,
                  "data-spread-duration": ring.duration,
                  "data-spread-tilt": -phone.tilt * p.side,
                })}
              >
                <div data-shadow className={styles.genieShadow} />
                <div
                  data-tilt
                  className={styles.genieTilt}
                  style={{ "--ds": DROP[p.ring].replace("SIDE", `${p.side * 10}px`) } as CSSProperties}
                />
              </div>
            </div>
          );
        })}
        {flat && (
          <Image
            src={phone.flat.src}
            alt=""
            width={phone.flat.w}
            height={phone.flat.h}
            sizes="52vw"
            className={styles.genieFlat}
            style={{
              left: pct(phone.flat.left - L0, BW),
              top: pct(phone.flat.top - T0, BH),
              width: pct(phone.flat.width, BW),
            }}
          />
        )}
      </div>
    </div>
  );
}

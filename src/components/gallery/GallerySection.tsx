import Image from "next/image";
import type { CSSProperties } from "react";
import { galleryConfig as cfg } from "./gallery.config";
import styles from "./GallerySection.module.scss";

type Props = {
  /** Inside another pinned section (no own page height / top padding). */
  embedded?: boolean;
};

const u = (n: number) => `calc(var(--u) * ${n})`;

/** "Component gallery": headline + a collage of UI components on a dashed grid. */
export function GallerySection({ embedded = false }: Props) {
  return (
    <section
      className={`${styles.section} ${embedded ? styles.embedded : ""}`}
      aria-labelledby="gallery-title"
    >
      <h2 id="gallery-title" className={styles.title}>
        {cfg.title}
      </h2>
      <p className={styles.body}>{cfg.body}</p>

      <div className={styles.frame}>
        <div
          className={styles.canvas}
          style={
            {
              "--u": `calc(${cfg.canvasWidth}vw / ${cfg.canvas.w})`,
              width: u(cfg.canvas.w),
              height: u(cfg.canvas.h),
            } as CSSProperties
          }
        >
          {cfg.lines.map((l, i) => (
            <span
              key={i}
              className={styles.line}
              data-dir={l.dir}
              aria-hidden
              style={
                l.dir === "h"
                  ? { top: u(l.at), left: u(l.from), width: u(l.to - l.from) }
                  : { left: u(l.at), top: u(l.from), height: u(l.to - l.from) }
              }
            />
          ))}

          {cfg.items.map((item) => (
            <Image
              key={item.id}
              src={`/images/gallery/${item.id}.png`}
              alt={item.alt}
              width={item.w}
              height={item.h}
              sizes={`${Math.ceil((item.width / cfg.canvas.w) * cfg.canvasWidth)}vw`}
              quality={90}
              className={styles.item}
              style={{ left: u(item.x), top: u(item.y), width: u(item.width) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

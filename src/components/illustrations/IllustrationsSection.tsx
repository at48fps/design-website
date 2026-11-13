import Image from "next/image";
import type { CSSProperties } from "react";
import { illustrationsConfig as cfg } from "./illustrations.config";
import styles from "./IllustrationsSection.module.scss";

type Props = {
  /** Inside another pinned section (no own page height / top padding). */
  embedded?: boolean;
};

/** "Asset illustrations": headline + a slowly sliding grid of 3D icons. */
export function IllustrationsSection({ embedded = false }: Props) {
  const columns = cfg.rows[0].length;

  return (
    <section
      className={`${styles.section} ${embedded ? styles.embedded : ""}`}
      aria-labelledby="illustrations-title"
    >
      <h2 id="illustrations-title" className={styles.title}>
        {cfg.title}
      </h2>
      <p className={styles.body}>{cfg.body}</p>

      <div
        className={styles.viewport}
        style={
          {
            "--cell": `${cfg.cellSize}vw`,
            "--cols": columns,
            "--duration": `${cfg.duration}s`,
          } as CSSProperties
        }
      >
        {/* Grid twice side by side so the slide loops seamlessly; the copy is hidden from screen readers. */}
        <div
          className={styles.track}
          data-static={cfg.duration === 0 || undefined}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className={styles.grid}
              aria-hidden={copy === 1 || undefined}
            >
              {cfg.rows.flat().map((src) => (
                <li key={src} className={styles.cell}>
                  <Image
                    src={src}
                    alt=""
                    width={cfg.image}
                    height={cfg.image}
                    sizes={`${cfg.cellSize}vw`}
                    quality={90}
                    className={styles.icon}
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

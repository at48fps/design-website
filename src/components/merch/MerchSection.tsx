import Image from "next/image";
import type { CSSProperties } from "react";
import { merchConfig as cfg } from "./merch.config";
import styles from "./MerchSection.module.scss";
import { HoverSlow } from "./HoverSlow";

/** "Cinematic merch": headline + two endless rows of feature cards moving in opposite directions. */
type Props = {
  /** Inside another pinned section (no own page height / top padding). */
  embedded?: boolean;
};

export function MerchSection({ embedded = false }: Props) {
  return (
    <section
      className={`${styles.section} ${embedded ? styles.embedded : ""}`}
      aria-labelledby="merch-title"
    >
      <h2 id="merch-title" className={styles.title}>
        {cfg.title}
      </h2>
      <p className={styles.body}>{cfg.body}</p>

      <HoverSlow
        hoverSpeed={cfg.hoverSpeed}
        className={styles.rows}
        style={
          {
            "--card-w": `${cfg.cardWidth}vw`,
            "--gap": `${cfg.gap}vw`,
          } as CSSProperties
        }
      >
        {cfg.rows.map((row, r) => (
          <div key={r} className={styles.row}>
            {/* Cards twice so the loop is seamless; the copy is hidden from screen readers. */}
            <ul
              className={styles.track}
              data-direction={row.direction}
              style={{ "--duration": `${row.duration}s` } as CSSProperties}
            >
              {[0, 1].map((copy) =>
                row.cards.map((c) => (
                  <li
                    key={`${copy}-${c.src}`}
                    className={styles.card}
                    aria-hidden={copy === 1 || undefined}
                  >
                    <Image
                      src={c.src}
                      alt={copy === 0 ? c.alt : ""}
                      width={cfg.image.w}
                      height={cfg.image.h}
                      sizes={`${cfg.cardWidth}vw`}
                      quality={90}
                      className={styles.cardImg}
                    />
                  </li>
                )),
              )}
            </ul>
          </div>
        ))}
      </HoverSlow>
    </section>
  );
}

import Image from "next/image";
import type { CSSProperties } from "react";
import { capabilitiesConfig as cfg } from "./capabilities.config";
import styles from "./CapabilitiesSection.module.scss";

/** "AI design tools": headline, intro and a grid of tool app icons. */
export function ToolsPage() {
  const t = cfg.tools;
  return (
    <div className={styles.intro}>
      <h2 className={styles.introTitle}>{t.title}</h2>
      <p className={styles.introBody}>{t.body}</p>
      <ul
        className={styles.tools}
        style={{ "--col": `${t.column}vw` } as CSSProperties}
      >
        {t.rows.flat().map((tool, i) => {
          // PNGs are 3x renders, so design units = pixels / 3.
          const width = (tool.w / 3) * t.scale;
          return (
            <li
              key={i}
              className={styles.tool}
              aria-hidden={i >= t.rows[0].length || undefined}
            >
              <Image
                src={tool.src}
                alt={i < t.rows[0].length ? tool.alt : ""}
                width={tool.w}
                height={tool.h}
                sizes={`${Math.ceil(width)}vw`}
                quality={90}
                className={styles.toolImg}
                style={{ width: `${width}vw` }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

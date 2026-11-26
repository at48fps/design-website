import Image from "next/image";
import Link from "next/link";
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
        {t.icons.map((tool, i) => {
          // PNGs are 3x renders, so design units = pixels / 3.
          const width = (tool.w / 3) * t.scale;
          const img = (
            <Image
              src={tool.src}
              alt={tool.alt}
              width={tool.w}
              height={tool.h}
              sizes={`${Math.ceil(width)}vw`}
              quality={90}
              className={styles.toolImg}
              style={{ width: `${width}vw` }}
            />
          );
          return (
            <li key={i} className={styles.tool}>
              {tool.slug ? (
                <Link
                  href={`/tool/${tool.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.toolLink}
                >
                  {img}
                </Link>
              ) : (
                img
              )}
            </li>
          );
        })}
      </ul>
      <a
        href={t.seeMore.href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.seeMore}
      >
        {t.seeMore.label}
      </a>
    </div>
  );
}

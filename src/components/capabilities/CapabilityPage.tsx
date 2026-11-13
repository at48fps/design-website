import Image from "next/image";
import type { CSSProperties } from "react";
import type { CapabilityPageData } from "./capabilities.config";
import styles from "./CapabilitiesSection.module.scss";

/** One capability page: icon on a soft glow, serif headline, intro copy. */
export function CapabilityPage({
  page,
  headingId,
}: {
  page: CapabilityPageData;
  headingId?: string;
}) {
  return (
    <div className={styles.page}>
      <div
        className={styles.icon}
        style={
          page.glow ? ({ "--glow": page.glow } as CSSProperties) : undefined
        }
      >
        {page.icon && (
          <Image
            src={page.icon.src}
            alt=""
            width={page.icon.w}
            height={page.icon.h}
            unoptimized={page.icon.src.endsWith(".svg")}
            sizes="20vw"
            quality={100}
            className={styles.iconImg}
          />
        )}
      </div>
      <h2 id={headingId} className={styles.title}>
        {page.title}
      </h2>
      <p className={styles.body}>{page.body}</p>
    </div>
  );
}

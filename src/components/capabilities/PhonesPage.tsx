import Image from "next/image";
import type { CSSProperties } from "react";
import { capabilitiesConfig as cfg } from "./capabilities.config";
import styles from "./CapabilitiesSection.module.scss";

/**
 * "Agentic commerce" with the POPgenie phone. Two more phones sit behind the
 * centre one and glide out left / right on the next scroll (step `spread`).
 * With enter "lift", the heading + copy rise from the intro page's spot and the
 * phones come up from the bottom.
 */
export function PhonesPage({ title, body }: { title: string; body: string }) {
  const phone = cfg.phones;
  const img = (alt: string) => (
    <Image
      src={phone.src}
      alt={alt}
      width={phone.w}
      height={phone.h}
      sizes={`${phone.width}vw`}
      quality={90}
      className={styles.phoneImg}
    />
  );

  return (
    <div className={styles.intro}>
      <h2 className={styles.introTitle} data-lift>{title}</h2>
      <p className={styles.introBody} data-lift>{body}</p>
      <div
        className={styles.phones}
        data-rise
        style={{ "--phone-w": `${phone.width}vw` } as CSSProperties}
      >
        <div className={styles.phoneSide} data-spread="-1" aria-hidden>
          {img("")}
        </div>
        <div className={styles.phoneSide} data-spread="1" aria-hidden>
          {img("")}
        </div>
        <div className={styles.phoneMain}>{img(phone.alt)}</div>
      </div>
    </div>
  );
}

import styles from "./PopHero.module.scss";

/**
 * Coded "pop Design" hero, rebuilt from the Figma hero frame (1512 × 1215),
 * same build as the popcorn tools site: a gradient plate, the "Design" wordmark
 * as live SVG text (painted fill, soft glow pulse, gradient outline) and the
 * pop logo on top. Every size is a multiple of --u (one Figma px).
 */
export function PopHero() {
  return (
    <div className={styles.hero} aria-hidden>
      <div className={styles.plate} />

      <div className={styles.art}>
        <svg className={styles.design} viewBox="0 0 1273 403" overflow="visible">
          <defs>
            <linearGradient id="hero-design-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="hero-design-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9a5c" stopOpacity="0.9" />
              <stop offset="1" stopColor="#7a3b22" stopOpacity="0.9" />
            </linearGradient>
            {/* placeholder under the painted fill while the image loads */}
            <linearGradient id="hero-design-ph" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4a2515" />
              <stop offset="0.55" stopColor="#8a4a28" />
              <stop offset="1" stopColor="#f0a45a" />
            </linearGradient>
            <clipPath id="hero-design-clip">
              <text x="0" y="418.9">
                Design
              </text>
            </clipPath>
            <filter id="hero-design-blur" x="-5%" y="-30%" width="110%" height="160%">
              <feGaussianBlur stdDeviation="13" />
            </filter>
          </defs>
          <g>
            <rect
              x="-87"
              y="-27"
              width="1440"
              height="590"
              fill="url(#hero-design-ph)"
              clipPath="url(#hero-design-clip)"
            />
            <image
              href="/images/hero/design-fill.webp"
              x="-86.69"
              y="-27.28"
              width="1440"
              height="590"
              preserveAspectRatio="none"
              clipPath="url(#hero-design-clip)"
            />
            <text
              className={styles.pulse}
              fill="url(#hero-design-fill)"
              filter="url(#hero-design-blur)"
              x="0"
              y="418.9"
            >
              Design
            </text>
            <text
              fill="none"
              stroke="url(#hero-design-stroke)"
              strokeWidth="1.1"
              x="0"
              y="418.9"
            >
              Design
            </text>
          </g>
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no optimisation needed */}
        <img className={styles.pop} src="/images/hero/pop.svg" alt="" />
      </div>
    </div>
  );
}

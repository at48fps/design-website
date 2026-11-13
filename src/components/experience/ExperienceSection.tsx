import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { experienceConfig as cfg } from "./experience.config";
import styles from "./ExperienceSection.module.scss";

type Props = { quilt: { src: string; w: number; h: number } };

/**
 * Section revealed by the paper tear: quilted background with the "LIVE" pill
 * and the brand film card. TearHero then grows the card to full screen, zooms it
 * out and fades it, revealing the "Truly levelled up" screen (plain background,
 * pop radio, floating icon bubbles, intro copy).
 */
export function ExperienceSection({ quilt }: Props) {
  const film = cfg.film;
  return (
    <section className={styles.section} aria-labelledby="experience-title">
      <Image
        src={quilt.src}
        alt=""
        width={quilt.w}
        height={quilt.h}
        sizes="100vw"
        quality={100}
        className={styles.quilt}
        data-film-fade
      />

      {/* "Truly levelled up" screen: hidden until the film card zooms out. */}
      <div className={`${styles.stage} ${styles.levelled}`} data-levelled>
        {cfg.bubbles.map((b) => {
          const width = (b.svgW / cfg.svgBubbleDiameter) * cfg.bubbleSize;
          const d = cfg.bubbleSize;
          const sh = cfg.shadow;
          const float = {
            "--float-range": `${b.float.range}px`,
            "--float-duration": `${b.float.duration}s`,
            "--float-delay": `${b.float.delay}s`,
          };
          const shadowStyle = {
            left: `${b.x + d * sh.offsetX}vw`,
            top: `${b.y + d * sh.offsetY}vw`,
            width: `${d * sh.width}vw`,
            height: `${d * sh.height}vw`,
            "--shadow-opacity": sh.opacity,
            ...float,
          } as CSSProperties;
          const style = {
            left: `${b.x}vw`,
            top: `${b.y}vw`,
            width: `${width}vw`,
            "--ox": `${(-b.cx / b.svgW) * 100}%`,
            "--oy": `${(-b.cy / b.svgH) * 100}%`,
            ...float,
          } as CSSProperties;
          return (
            <Fragment key={b.src}>
              <span className={styles.shadow} style={shadowStyle} aria-hidden />
              <div className={styles.bubble} style={style}>
                <Image
                  src={b.src}
                  alt={b.alt}
                  width={b.svgW}
                  height={b.svgH}
                  unoptimized
                  className={styles.bubbleImg}
                />
              </div>
            </Fragment>
          );
        })}

        <Image
          src={cfg.radio.src}
          alt="pop radio"
          width={cfg.radio.w}
          height={cfg.radio.h}
          sizes={`${cfg.radio.width}vw`}
          quality={100}
          className={styles.radio}
          style={{ width: `${cfg.radio.width}vw`, top: `${cfg.radio.top}vw` }}
        />

        <div className={styles.copy} style={{ top: `${cfg.textTop}vw` }}>
          <p className={styles.eyebrow}>Crafting an Experience</p>
          <h2 id="experience-title" className={styles.title}>
            Truly levelled up
          </h2>
          <p className={styles.body}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud Lorem ipsum dolor s, quis nostrudLorem
            ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
            tempor incididunt ut labore
          </p>
        </div>
      </div>

      {/* Assets seen right after the tear; kept a gap below the torn edge (--push). */}
      <div className={styles.stage} data-reveal-layer>
        <p
          className={styles.live}
          style={{ top: `${cfg.live.top}vw` }}
          data-film-fade
        >
          <span className={styles.liveDot} aria-hidden />
          LIVE NOW
        </p>

        <div
          className={styles.film}
          style={{
            left: `${(100 - film.width) / 2}vw`,
            top: `${film.top}vw`,
            width: `${film.width}vw`,
            height: `${(film.width * film.h) / film.w}vw`,
            borderRadius: `${film.width * film.radius}vw`,
          }}
          data-film-card
        >
          <Image
            src={film.src}
            alt={film.alt}
            fill
            sizes="100vw"
            quality={90}
            className={styles.filmImg}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { experienceConfig } from "@/components/experience/experience.config";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { progressFromTear, tearConfig } from "./tear.config";
import { TearRenderer } from "./TearRenderer";
import styles from "./TearHero.module.scss";

/**
 * First section: the pop Design banner, torn away on scroll with the
 * paper-tear shader to reveal the quilted section underneath.
 * Scrolling back up reverses the tear. Tune everything in tear.config.ts.
 * After the tear the pin continues: the brand film card grows to full screen,
 * zooms out and fades, revealing "Truly levelled up" (experience.config.ts → film).
 */
export function TearHero() {
  const { images, layout, motion } = tearConfig;
  const stageRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current!;
      const banner = bannerRef.current!;
      const gl = glRef.current!;
      const lower = lowerRef.current!;

      let renderer: TearRenderer | null = null;
      let ready = false;
      let target = 0; // scroll progress 0..1
      let current = 0; // eased progress actually drawn
      let dirty = true;
      let assetsTop = 0; // top of the highest asset, px from the section top
      let filmTarget = 0; // film zoom progress 0..1 (after the tear)
      let filmCurrent = 0;

      // Film card: grow to full screen → hold → zoom out + fade → "Truly levelled up".
      const film = experienceConfig.film;
      const card = lower.querySelector<HTMLElement>("[data-film-card]");
      const fades = lower.querySelectorAll<HTMLElement>("[data-film-fade]");
      const levelled = lower.querySelector<HTMLElement>("[data-levelled]");
      const vw = () => document.documentElement.clientWidth / 100;
      const vh = () => gl.clientHeight || window.innerHeight;
      const filmTl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      if (card) {
        const ratio = film.h / film.w;
        const px = (n: number) => `${n}px`; // GSAP would otherwise reuse the inline vw unit
        // Card box centred on screen at a given width (vw), never taller than the screen.
        const centred = (widthVw: number) => {
          const w = Math.min(widthVw * vw(), (vh() * 0.92) / ratio);
          const h = w * ratio;
          return {
            left: px((100 * vw() - w) / 2),
            top: px((vh() - h) / 2),
            width: px(w),
            height: px(h),
            borderRadius: px(w * film.radius),
          };
        };
        const rest = () => ({
          left: px(((100 - film.width) / 2) * vw()),
          top: px(film.top * vw()),
          width: px(film.width * vw()),
          height: px(film.width * ratio * vw()),
          borderRadius: px(film.width * film.radius * vw()),
        });
        const box = (get: () => Record<string, string>) => ({
          left: () => get().left,
          top: () => get().top,
          width: () => get().width,
          height: () => get().height,
          borderRadius: () => get().borderRadius,
        });

        filmTl
          // 1. Quilt + LIVE slide up and fade; the card grows as it rises until it
          //    sits fully on screen, almost full width.
          // Same distance + easing as the card's top edge, so the gap between the
          // LIVE pill and the card never shrinks (the card never covers it).
          .fromTo(
            fades,
            { y: 0 },
            {
              y: () =>
                -(parseFloat(rest().top) - parseFloat(centred(film.grownWidth).top)),
              duration: 0.35,
              ease: "power2.inOut",
            },
            0,
          )
          .fromTo(
            fades,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: 0.35, ease: "power2.in" },
            0,
          )
          .fromTo(
            card,
            { ...box(rest), y: 0, autoAlpha: 1 },
            {
              ...box(() => centred(film.grownWidth)),
              duration: 0.35,
              ease: "power2.inOut",
            },
            0,
          )
          // 2. Zoom in to fill the screen.
          .to(
            card,
            {
              left: "0px",
              top: "0px",
              width: () => px(100 * vw()),
              height: () => px(vh()),
              borderRadius: "0px",
              duration: 0.25,
              ease: "power2.inOut",
            },
            0.42,
          )
          // 3. (hold) then zoom back out to a smaller card.
          .to(
            card,
            {
              ...box(() => centred(film.exitWidth)),
              duration: 0.25,
              ease: "power2.inOut",
            },
            0.77,
          )
          // 4. The small card moves up and fades out...
          .to(
            card,
            { y: () => -0.6 * vh(), duration: 0.3, ease: "power2.out" },
            1.07,
          )
          .to(card, { autoAlpha: 0, duration: 0.22, ease: "power1.out" }, 1.07);
        // ...then "Truly levelled up" rises from the bottom and fades in.
        if (levelled) {
          // Starts with the card's exit: the radio peeks in at the bottom edge,
          // then rises slowly at first so it stays clear of the card leaving up top.
          filmTl
            .fromTo(
              levelled,
              { y: () => 0.75 * vh() },
              { y: 0, duration: 0.5, ease: "power1.inOut" },
              1.07,
            )
            .fromTo(
              levelled,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.35, ease: "power1.out" },
              1.07,
            );
        }
      }

      // Measure where the assets start (without any push applied).
      const measureAssets = () => {
        const layer = lower.querySelector<HTMLElement>("[data-reveal-layer]");
        if (!layer) return;
        lower.style.setProperty("--push", "0px");
        const base = lower.getBoundingClientRect().top;
        let top = Infinity;
        for (const el of Array.from(layer.children)) {
          top = Math.min(top, el.getBoundingClientRect().top - base);
        }
        assetsTop = Number.isFinite(top) ? Math.max(top, 0) : 0;
      };
      measureAssets();

      const draw = (time: number) => {
        const done = current >= 0.999;
        if (ready && renderer) {
          const start = layout.start;
          const tear = start + (layout.end - start) * current;
          const progress = progressFromTear(tear);
          // The page under the paper rises into place over the whole tear and eases to
          // a stop as the edge leaves the top (x²(2-x): starts at linear speed, lands
          // with zero speed). A linear rise ending at tear = 1 stopped dead while the
          // edge was still on screen, then left a dead scroll before the film started.
          const riseLeft = Math.min(
            Math.max((layout.end - tear) / (layout.end - start), 0),
            1,
          );
          const rise =
            riseLeft *
            riseLeft *
            (2 - riseLeft) *
            motion.lowerScroll *
            (gl.clientHeight || window.innerHeight);
          lower.style.transform = done
            ? ""
            : `translate3d(0, ${rise.toFixed(2)}px, 0)`;
          // Keep the assets a blank gap below the torn edge: they ride up behind it
          // and only settle in their spot once the edge has passed them.
          const vh = gl.clientHeight || window.innerHeight;
          const edgeY = (1 - tear) * vh;
          const push = done
            ? 0
            : Math.max(0, edgeY + motion.assetsGap * vh - (rise + assetsTop));
          lower.style.setProperty("--push", `${push.toFixed(2)}px`);
          gl.style.visibility = done ? "hidden" : "visible";
          banner.style.visibility = "hidden";
          if (!done) renderer.render(tear, start, progress, time);
        } else {
          // WebGL not ready / unsupported: simple fade so the section still works.
          banner.style.visibility = done ? "hidden" : "visible";
          banner.style.opacity = String(1 - current);
          lower.style.transform = "";
          lower.style.setProperty("--push", "0px");
        }
      };

      // Ease toward the scroll position each frame (like the repo's scroll smoothing).
      const tick = (time: number, deltaMs: number) => {
        const k =
          1 -
          Math.pow(
            Math.min(Math.max(layout.smoothing, 0), 0.95),
            deltaMs / 16.67,
          );
        const next = current + (target - current) * k;
        const settled = Math.abs(target - next) < 0.0005;
        const moving = Math.abs(next - current) > 1e-5;
        current = settled ? target : next;

        const filmNext = filmCurrent + (filmTarget - filmCurrent) * k;
        const filmMoving = Math.abs(filmNext - filmCurrent) > 1e-5;
        filmCurrent =
          Math.abs(filmTarget - filmNext) < 0.0005 ? filmTarget : filmNext;
        if (filmMoving || dirty) filmTl.progress(filmCurrent);
        if (moving || dirty || (motion.autoEdgeMovement && current < 0.999)) {
          dirty = false;
          draw(time);
        }
      };
      gsap.ticker.add(tick);

      try {
        renderer = new TearRenderer(gl);
        renderer
          .load(images.banner.src)
          .then(() => {
            ready = true;
            dirty = true;
          })
          .catch(() => {
            renderer?.dispose();
            renderer = null;
          });
      } catch {
        renderer = null;
      }

      // One pin: the tear first, then the film zoom.
      const total = layout.pinLength + (card ? film.scrollLength : 0);
      const split = (progress: number) => {
        const s = progress * total;
        target = Math.min(Math.max(s / layout.pinLength, 0), 1);
        filmTarget = card
          ? Math.min(Math.max((s - layout.pinLength) / film.scrollLength, 0), 1)
          : 0;
      };

      const trigger = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: () => `+=${window.innerHeight * total}`,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => split(self.progress),
        onRefresh: (self) => {
          split(self.progress);
          current = target;
          filmCurrent = filmTarget;
          filmTl.invalidate().progress(0);
          measureAssets(); // at rest, before the film timeline moves anything
          filmTl.progress(filmCurrent);
          renderer?.resize();
          dirty = true;
        },
      });

      // The pin length changes the page height: re-measure every other trigger.
      const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        cancelAnimationFrame(refreshId);
        gsap.ticker.remove(tick);
        trigger.kill();
        filmTl.kill();
        renderer?.dispose();
      };
    },
    { scope: stageRef },
  );

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      aria-labelledby="hero-title"
    >
      <h1 id="hero-title" className={styles.srOnly}>
        Pop Design — the design team behind Pop UPI by Razorpay
      </h1>

      {/* Revealed page: real DOM, seen through the transparent tear canvas. */}
      <div ref={lowerRef} className={styles.lower}>
        <ExperienceSection quilt={images.quilt} />
      </div>

      {/* Banner as a real image for first paint, SEO and no-WebGL fallback. */}
      <div
        ref={bannerRef}
        className={styles.banner}
        style={
          {
            "--img-ratio": images.banner.w / images.banner.h,
            "--shift-up": images.banner.shiftUp,
            "--travel": motion.bannerTravel,
          } as React.CSSProperties
        }
      >
        <div className={styles.bannerFrame}>
          <Image
            src={images.banner.src}
            alt="pop Design"
            fill
            priority
            sizes="(max-aspect-ratio: 1/1) 300vh, 100vw"
            quality={100}
            className={styles.bannerImg}
          />
        </div>
      </div>

      <div ref={glRef} className={styles.gl} aria-hidden />
    </section>
  );
}

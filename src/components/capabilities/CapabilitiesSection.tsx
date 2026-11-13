"use client";

import { useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { capabilitiesConfig as cfg } from "./capabilities.config";
import { CapabilityPage } from "./CapabilityPage";
import styles from "./CapabilitiesSection.module.scss";

export type CapabilityStep = {
  node: ReactNode;
  /**
   * "side": exit left / enter right with fades. "up": push up from the bottom, no fades.
   * "lift": [data-lift] elements (heading, copy) move up from where the current page
   * has its [data-lift] elements; [data-rise] elements come up from the bottom.
   */
  enter?: "side" | "up" | "lift";
  /** Tab that becomes active with this page (its line fills during the change). */
  tab?: number;
  /** Centre the page vertically in the space under the tab row. */
  center?: boolean;
  /**
   * One more scroll step after this page lands: elements marked
   * data-spread="-1" / "1" glide out from behind the centre to the left / right.
   */
  spread?: boolean;
};

type Props = { steps: CapabilityStep[] };

/**
 * Pinned capabilities story. The tab row stays still; each scroll step swaps
 * the page ("side" or "up" transition). Starts on "Visual design".
 */
export function CapabilitiesSection({ steps }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const count = cfg.tabs.length;

  useGSAP(
    () => {
      const q = gsap.utils.selector(sectionRef);
      const panels = q(`.${styles.panel}`);
      const fills = q(`.${styles.lineFill}`);
      const box = q(`.${styles.panels}`)[0] as HTMLElement;
      const dist = cfg.slideDistance;
      const slide = 1 - cfg.hold;
      const height = () => box.offsetHeight;
      // Layout top (ignores transforms), so it is stable mid-animation.
      const pageTop = (el: HTMLElement) => {
        let top = 0;
        for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null)
          top += n.offsetTop;
        return top;
      };

      gsap.set(panels.slice(1), { autoAlpha: 0 });
      gsap.set(fills, { scaleX: (i: number) => (i === 0 ? cfg.lineFill : 0) });

      // Each step is 1 long: hold, then the change.
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      const tabChanges: { at: number; tab: number }[] = [];

      let cursor = 0; // timeline position; each page change (and each spread) takes 1
      steps.forEach((step, i) => {
        const at = cursor + cfg.hold;
        cursor += 1;
        const current = panels[i];
        const incoming = panels[i + 1];

        if (step.enter === "lift") {
          // Heading + copy: the incoming page's copies start exactly where the
          // current page shows them, then glide up into place. The swap is invisible.
          const from = current.querySelectorAll<HTMLElement>("[data-lift]");
          const to = incoming.querySelectorAll<HTMLElement>("[data-lift]");
          tl.set(current, { autoAlpha: 0 }, at).set(
            incoming,
            { autoAlpha: 1, x: 0 },
            at,
          );
          to.forEach((el, k) => {
            const src = from[k];
            if (!src) return;
            tl.fromTo(
              el,
              { y: () => pageTop(src) - pageTop(el) },
              { y: 0, duration: slide, immediateRender: false },
              at,
            );
          });
          // Everything else marked data-rise comes up from below the screen.
          tl.fromTo(
            incoming.querySelectorAll<HTMLElement>("[data-rise]"),
            { y: () => height() },
            { y: 0, duration: slide, immediateRender: false },
            at,
          );
        } else if (step.enter === "up") {
          // Push: both pages move up together, fully opaque.
          tl.to(current, { y: () => -height(), duration: slide }, at)
            .set(current, { autoAlpha: 0 }, at + slide)
            .fromTo(
              incoming,
              { y: () => height(), autoAlpha: 1 },
              { y: 0, duration: slide, immediateRender: false },
              at,
            );
        } else {
          // Slide sideways; fades are offset so the pages barely overlap.
          tl.to(current, { x: `-${dist}vw`, duration: slide }, at)
            .to(
              current,
              { autoAlpha: 0, duration: slide * 0.55, ease: "power1.in" },
              at,
            )
            .fromTo(
              incoming,
              { x: `${dist}vw` },
              { x: 0, duration: slide, immediateRender: false },
              at,
            )
            .fromTo(
              incoming,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: slide * 0.55,
                ease: "power1.out",
                immediateRender: false,
              },
              at + slide * 0.45,
            );
        }

        if (step.tab !== undefined && step.tab > 0) {
          tl.to(
            fills[step.tab - 1],
            { scaleX: 1, duration: slide, ease: "none" },
            at,
          );
          tabChanges.push({ at: at + slide / 2, tab: step.tab });
        }

        if (step.spread) {
          const spreadAt = cursor + cfg.hold;
          cursor += 1;
          incoming
            .querySelectorAll<HTMLElement>("[data-spread]")
            .forEach((el) => {
              const dir = Number(el.dataset.spread) || 0;
              tl.fromTo(
                el,
                { x: 0, autoAlpha: 0 },
                {
                  x: `${dir * cfg.spreadDistance}vw`,
                  autoAlpha: 1,
                  duration: slide,
                  immediateRender: true,
                },
                spreadAt,
              );
            });
        }
      });
      const length = cursor;

      // Flag pages that are fully hidden so CSS can pause their animations.
      const markHidden = () => {
        panels.forEach((p) => {
          const off = Number(gsap.getProperty(p, "opacity")) === 0;
          if (off !== p.hasAttribute("data-off"))
            p.toggleAttribute("data-off", off);
        });
      };
      markHidden();

      let last = 0;
      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => `+=${window.innerHeight * cfg.slideLength * length}`,
            pin: true,
            pinSpacing: true,
            // No anticipatePin: with Lenis it pins early and snaps the page up by the
            // remaining distance (a visible jerk when "Visual design" lands).
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: () => {
              markHidden();
              const t = tl.time();
              const tab = tabChanges.reduce(
                (acc, c) => (t >= c.at ? c.tab : acc),
                0,
              );
              if (tab !== last) {
                last = tab;
                setActive(tab);
              }
            },
          },
        })
        .add(tl);
    },
    { scope: sectionRef, dependencies: [steps.length] },
  );

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="capabilities-title"
    >
      <ol className={styles.tabs} aria-label="What we do">
        {cfg.tabs.map((tab, i) => (
          <li key={tab} className={styles.tabGroup}>
            <span
              className={styles.tab}
              data-active={i === active}
              aria-current={i === active || undefined}
            >
              {tab}
            </span>
            {i < count - 1 && (
              <span className={styles.line} aria-hidden>
                <span className={styles.lineFill} />
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className={styles.panels}>
        <article className={styles.panel}>
          <CapabilityPage page={cfg.visual} headingId="capabilities-title" />
        </article>

        {steps.map((step, i) => (
          <div
            key={i}
            className={`${styles.panel} ${styles.nextPanel} ${step.center ? styles.centerPanel : ""}`}
          >
            {step.node}
          </div>
        ))}
      </div>
    </section>
  );
}

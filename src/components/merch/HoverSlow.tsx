"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  className?: string;
  style?: CSSProperties;
  /** Speed while hovered, as a share of normal speed (0.3 = 30%). */
  hoverSpeed: number;
  children: ReactNode;
};

/**
 * Wraps CSS marquee rows: on hover their animations ease down to `hoverSpeed`
 * (not a full stop), and ease back to full speed on leave.
 */
export function HoverSlow({ className, style, hoverSpeed, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rate = useRef({ value: 1 });

  const ease = (to: number) => {
    const el = ref.current;
    if (!el) return;
    const anims = el.getAnimations({ subtree: true });
    gsap.to(rate.current, {
      value: to,
      duration: 0.6,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () =>
        anims.forEach((a) => (a.playbackRate = rate.current.value)),
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onPointerEnter={() => ease(hoverSpeed)}
      onPointerLeave={() => ease(1)}
    >
      {children}
    </div>
  );
}

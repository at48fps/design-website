"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { NEW_LAUNCHES_EVENT, NEW_LAUNCHES_HASH } from "./navEvents";
import styles from "./SiteNav.module.scss";

type NavLink = { label: string; href: string; newTab?: boolean };

/** Links either side of the sticker. */
const LEFT: NavLink[] = [
  { label: "Features", href: "/features" },
  // Home page scrolls to the brand film card; other pages open home there.
  { label: "New Launches", href: `/#${NEW_LAUNCHES_HASH}` },
];
const RIGHT: NavLink[] = [
  { label: "Playground", href: "https://playground-tool-ritik.vercel.app/?theme=dark", newTab: true },
  { label: "Tools", href: "https://popcorn.design/", newTab: true },
];

/** How long after the last scroll event the bar springs back to full size (ms). */
const SETTLE_MS = 140;

/**
 * Displacement map for the liquid-glass lens, sized to the bar (px). Red = x
 * shift, blue = y shift; a soft neutral grey core means no shift in the middle,
 * so the page behind is only bent (magnified) toward the edges.
 */
function lensMap(w: number, h: number) {
  const edge = Math.max(5, h * 0.16);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#000"/><stop offset="100%" stop-color="#f00"/></linearGradient>
      <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#000"/><stop offset="100%" stop-color="#00f"/></linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#000"/>
    <rect width="${w}" height="${h}" fill="url(#r)"/>
    <rect width="${w}" height="${h}" fill="url(#b)" style="mix-blend-mode:difference"/>
    <rect x="${edge}" y="${edge * 0.4}" width="${w - edge * 2}" height="${h - edge * 1.4}" rx="${h * 0.42}" fill="rgb(128,128,128)" fill-opacity="0.97" style="filter:blur(${edge * 0.38}px)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Glass tab bar fixed to the top edge, "Design" sticker in the middle.
 * While the page scrolls it shrinks a little; when scrolling stops it springs back.
 */
export function SiteNav() {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // Lens map for the bar's current size (null until measured).
  const [lens, setLens] = useState<{ w: number; h: number; map: string } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const onScroll = () => {
      if (!el.hasAttribute("data-scrolling")) el.setAttribute("data-scrolling", "");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.removeAttribute("data-scrolling"), SETTLE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // The SVG lens (backdrop-filter: url()) only works in Chromium; other
    // browsers keep the plain frosted glass.
    const liquid = "userAgentData" in navigator;
    if (liquid) el.setAttribute("data-liquid", "");
    const ro = new ResizeObserver(() => {
      if (!liquid) return;
      // Layout size, without the scroll scale.
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      setLens((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h, map: lensMap(w, h) }));
    });
    ro.observe(el);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  // Already on the home page: smooth-scroll there instead of reloading.
  const onNewLaunches = (e: MouseEvent) => {
    if (pathname !== "/") return;
    e.preventDefault();
    window.dispatchEvent(new Event(NEW_LAUNCHES_EVENT));
  };

  const links = (items: NavLink[]) =>
    items.map((item, i) => (
      <a
        key={i}
        href={item.href}
        className={styles.link}
        {...(item.newTab && { target: "_blank", rel: "noopener noreferrer" })}
        onClick={item.href === `/#${NEW_LAUNCHES_HASH}` ? onNewLaunches : undefined}
      >
        {item.label}
      </a>
    ));

  return (
    <nav ref={ref} className={styles.nav} aria-label="Main">
      {/* Tab outline: flared top corners, wide round bottom corners (bounding-box units). */}
      <svg className={styles.defs} aria-hidden focusable="false">
        <clipPath id="site-nav-shape" clipPathUnits="objectBoundingBox">
          <path d="M0,0 H1 C0.972,0.5 0.958,1 0.872,1 H0.128 C0.042,1 0.028,0.5 0,0 Z" />
        </clipPath>
        {lens && (
          // Liquid glass: bend the page behind toward the edges, split the colours a
          // touch at the rim, then a very light blur.
          <filter
            id="site-nav-liquid"
            x="0"
            y="0"
            width={lens.w}
            height={lens.h}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={lens.map} x="0" y="0" width={lens.w} height={lens.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={-lens.h * 0.62} xChannelSelector="R" yChannelSelector="B" result="r" />
            <feColorMatrix in="r" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={-lens.h * 0.58} xChannelSelector="R" yChannelSelector="B" result="g" />
            <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={-lens.h * 0.54} xChannelSelector="R" yChannelSelector="B" result="b" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="rgb" />
            <feGaussianBlur in="rgb" stdDeviation="0.7" />
          </filter>
        )}
      </svg>

      <div className={styles.shadow} aria-hidden>
        <div className={styles.shadowShape} />
      </div>
      <div className={styles.glass} aria-hidden />

      <div className={styles.items}>
        {links(LEFT)}
        <a href="/" className={styles.sticker} aria-label="Pop Design home">
          <Image
            src="/designSticker.svg"
            alt="Design"
            width={95}
            height={62}
            unoptimized
            priority
            className={styles.stickerImg}
          />
        </a>
        {links(RIGHT)}
      </div>
    </nav>
  );
}

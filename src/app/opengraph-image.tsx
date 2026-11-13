import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Placeholder OG image. Replace with Figma asset (opengraph-image.png, 1200x630) when ready.
export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: "#000",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700 }}>{site.name}</div>
        <div style={{ fontSize: 36, opacity: 0.7, marginTop: 16 }}>{site.shortDescription}</div>
      </div>
    ),
    size,
  );
}

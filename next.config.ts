import type { NextConfig } from "next";
import path from "node:path";

const shaderLoader = {
  loaders: ["raw-loader"],
  as: "*.js",
};

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 100],
  },

  // Import .glsl / .vert / .frag files as strings for Three.js shaders.
  turbopack: {
    rules: {
      "*.glsl": shaderLoader,
      "*.vert": shaderLoader,
      "*.frag": shaderLoader,
    },
  },

  sassOptions: {
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/:file(llms.txt|llms-full.txt)",
        headers: [{ key: "Content-Type", value: "text/markdown; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // los tests de punta a punta usan su propia carpeta para no chocar con `npm run dev`
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingExcludes: { "/*": ["./.casos-local/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

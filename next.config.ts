import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 같은 와이파이의 휴대폰에서 PC IP로 접속할 수 있게 (개발 서버에만 적용)
  allowedDevOrigins: ["192.168.*.*"],
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

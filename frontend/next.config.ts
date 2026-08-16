import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['10.23.69.37', 'localhost', '127.0.0.1'],
};

export default nextConfig;

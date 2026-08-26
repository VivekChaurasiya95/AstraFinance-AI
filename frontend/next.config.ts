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
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['10.23.69.37', 'localhost', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;

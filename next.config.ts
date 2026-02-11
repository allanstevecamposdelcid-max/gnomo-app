import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Indicador de desarrollo (posición solamente)
  devIndicators: {
    position: "bottom-right",
  },

  // Typed routes ya es estable en Next 16
  typedRoutes: true,
};

export default nextConfig;

// next.config.js
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // DESACTIVAR TURBOPACK (Firebase App Hosting NO lo soporta aún)
  experimental: {
    turbopack: false,
  },

  // Soporte para alias @/ (si usas tsconfig paths)
  webpack(config) {
    if (!config.resolve.plugins) {
      config.resolve.plugins = [];
    }
    config.resolve.plugins.push(new TsconfigPathsPlugin());
    return config;
  },
};

module.exports = nextConfig;
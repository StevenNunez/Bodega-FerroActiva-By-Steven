// next.config.js
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // Soporte para alias @/ via tsconfig paths
    if (!config.resolve.plugins) config.resolve.plugins = [];
    config.resolve.plugins.push(new TsconfigPathsPlugin());

    return config;
  },

  // Quitamos turbopack: {} porque no desactiva nada y puede causar warnings
};

module.exports = nextConfig;
// next.config.js
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ESTO ES LO QUE NECESITAS: FORZAR WEBPACK Y DESACTIVAR TURBOPACK
  // https://nextjs.org/docs/messages/turbopack-webpack-config
  webpack: (config) => {
    // Soporte para alias @/
    if (!config.resolve.plugins) config.resolve.plugins = [];
    config.resolve.plugins.push(new TsconfigPathsPlugin());

    return config;
  },

  // Esto le dice a Next.js: "NO uses Turbopack, usa Webpack"
  turbopack: {}, // ← objeto vacío = Turbopack desactivado
};

module.exports = nextConfig;
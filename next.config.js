const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const nextConfig = {
  webpack(config) {
    if (!config.resolve.plugins) {
      config.resolve.plugins = [];
    }
    config.resolve.plugins.push(new TsconfigPathsPlugin());
    return config;
  },
};
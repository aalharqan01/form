const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Only framework-independent domain code is shared with the web application.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, '../lib'),
];
module.exports = config;

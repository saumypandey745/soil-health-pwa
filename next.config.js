const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // dev me service worker off, warna caching se debugging pain hoti hai
});

const { i18n } = require('./next-i18next.config');

module.exports = withPWA({
  reactStrictMode: true,
  i18n,
});

/* eslint-disable import/no-extraneous-dependencies */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

const { i18n } = require('./next-i18next.config');

// GitHub Pages builds a fully static site: no Node server, no API routes, no
// locale-prefixed routing. Everything gated on this flag keeps the default
// (Vercel/Netlify) build byte-for-byte unchanged.
const isGithubPages = process.env.GITHUB_PAGES === 'true';

// When served from https://<user>.github.io/<repo>, every asset and route needs
// the repo name as a prefix. Set NEXT_PUBLIC_BASE_PATH='' for a user/org root repo.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isGithubPages ? '/falinks-teambuilder' : '');

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  eslint: {
    dirs: ['.']
  },
  images: isGithubPages
    ? // next/image's optimizer is a server feature; static export needs raw <img> output.
      { unoptimized: true }
    : { domains: ['play.pokemonshowdown.com'] },
  staticPageGenerationTimeout: 600,
  poweredByHeader: false,
  trailingSlash: true,
  basePath,
  // The starter code load resources from `public` folder with `router.basePath` in React components.
  // So, the source code is "basePath-ready".
  // You can remove `basePath` if you don't need it.
  reactStrictMode: false,
  ...(isGithubPages
    ? {
        output: 'export'
        // `rewrites` and `i18n` are both server-side features and are unsupported
        // by `output: 'export'`. The bare /pastes/vgc and /usages/* aliases they
        // provided are replaced by redirect stubs written in scripts/build-gh-pages.mjs.
      }
    : {
        async rewrites() {
          return [
            {
              source: '/pastes/vgc',
              destination: '/pastes/vgc/gen9vgc2024regg' // Update the path when a new VGC format is released
            },
            {
              source: '/usages/vgc',
              destination: '/usages/vgc/gen9vgc2024regg' // Update the path when a new VGC format is released
            },
            {
              source: '/usages/smogon',
              destination: '/usages/smogon/gen9vgc2024regg' // Update the path when a new VGC format is released
            },
            {
              source: '/replays',
              destination: '/replays/gen9vgc2024regg' // Update the path when a new format is released
            }
          ];
        },
        i18n
      })
  // compress: false,
};

module.exports = withBundleAnalyzer(nextConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  // For Cloudflare Pages
  distDir: '.next',
}

module.exports = nextConfig
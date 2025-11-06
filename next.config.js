/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore Jekyll directories in Next.js build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Don't interfere with Jekyll structure
  distDir: '.next',
  // Server-side rendering
  reactStrictMode: true,
}

module.exports = nextConfig


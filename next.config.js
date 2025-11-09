const createMDX = require('@next/mdx')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore Jekyll directories in Next.js build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Don't interfere with Jekyll structure
  distDir: '.next',
  // Server-side rendering
  reactStrictMode: true,
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  extension: /\.mdx?$/,
})

module.exports = withMDX(nextConfig)


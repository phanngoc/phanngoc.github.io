const createMDX = require('@next/mdx')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export cho GitHub Pages
  output: 'export',
  
  // Ignore Jekyll directories in Next.js build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Don't interfere with Jekyll structure
  distDir: '.next',
  // Server-side rendering
  reactStrictMode: true,
  
  // Không optimize images khi export static
  images: {
    unoptimized: true,
  },
  
  // Trailing slash để GitHub Pages hoạt động tốt hơn
  trailingSlash: true,
  
  // Exclude dynamic routes và API routes khi build static
  // Chỉ build các static pages như tutorials
  // Note: Next.js sẽ tự động skip API routes khi dùng output: 'export'
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  extension: /\.mdx?$/,
})

module.exports = withMDX(nextConfig)


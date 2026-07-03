/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/koc-analyzer-demo',
  trailingSlash: true,
}

module.exports = nextConfig

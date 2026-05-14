/** @type {import('next').NextConfig} */
// Quando o front usa URL relativa (/api/...) sem NEXT_PUBLIC_API_URL, o Next precisa encaminhar ao backend Node.
// Defina no deploy do front: BACKEND_URL ou NEXT_PUBLIC_API_URL = URL base da API (ex.: https://api.seudominio.com)
const backendBase = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '')
  .trim()
  .replace(/\/+$/, '')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!backendBase) return []
    return [{ source: '/api/:path*', destination: `${backendBase}/api/:path*` }]
  },
}

export default nextConfig

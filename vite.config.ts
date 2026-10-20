/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstream = (env.VITE_SUPABASE_URL ?? '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  const configured = upstream && (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (command === 'build' && configured) {
    const routing = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
    // Static Vercel rewrites cannot interpolate Vite environment variables.
    // Fail visibly instead of accidentally sending credentials to another project.
    for (const service of ['auth', 'rest', 'storage']) {
      const source = `/clinic-api/${service}/v1/:path*`
      if (!routing.rewrites.some((route: { source: string; destination: string }) =>
        route.source === source && route.destination === `${upstream}/${service}/v1/:path*`)) {
        throw new Error('Supabase URL does not match vercel.json proxy destinations. Update all three destinations before building.')
      }
    }
  }
  const proxy = configured ? Object.fromEntries(['auth', 'rest', 'storage'].map(service => [
    `/clinic-api/${service}/v1`,
    { target: upstream, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/clinic-api/, '') },
  ])) : undefined
  return {
    server: { proxy },
    preview: { proxy },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo-glass.webp'],
        manifest: {
          name: 'La Min Clinic — လမင်း ဆေးခန်း',
          short_name: 'La Min',
          description: 'Daily clinic ledger — နေ့စဉ် လူနာမှတ်တမ်း',
          theme_color: '#F2F6F3',
          background_color: '#F2F6F3',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
          navigateFallbackDenylist: [/^\/clinic-api(?:\/|$)/],
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // basicSsl hanya untuk dev lokal (HTTPS di LAN), skip saat build production
    ...(!isProduction ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'JKT Motor Mobile',
        short_name: 'JKT Mobile',
        description: 'Aplikasi Karyawan Jakarta Motor',
        theme_color: '#09090b',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5174, // Different from frontend (5173)
  }
})

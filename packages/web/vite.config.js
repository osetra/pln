import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'

export default defineConfig({
    plugins: [
        vue(),
        quasar(),
    ],
    server: {
        fs: {
            allow: ['../..'],
        },
        proxy: {
            '/leo': {
                target: 'http://127.0.0.1:5232',
                changeOrigin: true,
            }
        }
    }
})

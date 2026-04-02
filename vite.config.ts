import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    proxy: {
      // 与 VITE_API_BASE_URL=/api 配合：/api/* 原样转发到 Nest（后端已 setGlobalPrefix('api')）
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // 头像等静态资源在 /uploads/*，与 API 前缀分离；若前端只用相对路径 /uploads/... 需此条
      '/uploads': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

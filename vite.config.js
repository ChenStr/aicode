import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  // 使用相对路径，确保可以独立运行
  base: './',
  build: {
    // 生成单文件HTML，解决CORS问题
    rollupOptions: {
      output: {
        // 将所有资源内联到HTML中
        manualChunks: undefined,
        inlineDynamicImports: true,
        // 确保所有资源都内联到HTML中
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js'
      }
    },
    // 确保生成单文件 - 将所有资源内联
    assetsInlineLimit: Infinity,
    // 禁用代码分割
    chunkSizeWarningLimit: Infinity,
    // 生成sourcemap用于调试
    sourcemap: false,
    // 强制内联所有资源
    cssCodeSplit: false
  },
})

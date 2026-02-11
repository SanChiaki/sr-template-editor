import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { PreRenderedAsset } from 'rollup'

// 库模式配置
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: isLib ? {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'SmartReportDesigner',
        formats: ['es', 'cjs'],
        fileName: (format) => `smart-report-designer.${format}.js`,
      },
      rollupOptions: {
        // 外部依赖 - 不打包进库
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          '@grapecity/spread-sheets',
          '@grapecity/spread-sheets-designer',
          '@grapecity/spread-sheets-designer-react',
          '@grapecity/spread-sheets-shapes',
          '@grapecity/spread-sheets-charts',
          '@grapecity/spread-sheets-designer-resources-cn',
          '@grapecity/spread-sheets-designer-resources-en',
          '@grapecity/spread-sheets-tablesheet',
          '@grapecity/spread-sheets-barcode',
          '@grapecity/spread-sheets-languagepackages',
          '@grapecity/spread-sheets-print',
          '@grapecity/spread-sheets-pdf',
          '@grapecity/spread-sheets-pivot-addon',
          '@grapecity/spread-sheets-resources-zh',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          assetFileNames: (assetInfo: PreRenderedAsset) => {
            if (assetInfo.name === 'style.css') return 'smart-report-designer.css'
            return assetInfo.name || 'assets/[name][extname]'
          },
        },
      },
      cssCodeSplit: false,
      sourcemap: true,
    } : undefined,
  }
})
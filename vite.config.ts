import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import type { PreRenderedAsset } from 'rollup'

const normalizeBasePath = (rawBasePath?: string) => {
  if (!rawBasePath) {
    return '/'
  }

  const trimmedBasePath = rawBasePath.trim()

  if (!trimmedBasePath || trimmedBasePath === '/') {
    return '/'
  }

  if (/^https?:\/\//i.test(trimmedBasePath)) {
    return trimmedBasePath.endsWith('/') ? trimmedBasePath : `${trimmedBasePath}/`
  }

  const withLeadingSlash = trimmedBasePath.startsWith('/')
    ? trimmedBasePath
    : `/${trimmedBasePath}`

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

// 库模式配置
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isLib = mode === 'lib'
  const base = normalizeBasePath(env.VITE_APP_BASE_PATH)
  const appBuild = {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        iframeHost: path.resolve(__dirname, 'iframe-host.html'),
      },
    },
  }

  return {
    base: isLib ? '/' : base,
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
    } : appBuild,
  }
})

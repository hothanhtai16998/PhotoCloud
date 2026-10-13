import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Ensure React is properly handled for React 19
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
    // Bundle analyzer - generates stats.html in dist folder
    // Run with ANALYZE=true npm run build to generate analysis
    process.env.ANALYZE === 'true' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    cssCodeSplit: true,
    // Optimize chunk size limits (in KB)
    // Warn if any chunk exceeds 500KB (helps identify optimization opportunities)
    chunkSizeWarningLimit: 500,
    // Ensure proper module resolution and prevent React loading issues
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      // Preserve entry signatures to keep React in entry chunk
      preserveEntrySignatures: 'strict',
      output: {
        // Explicitly control chunk file names
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Ensure consistent naming for CSS files
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Let Rollup split the dependency graph automatically. Manual vendor
        // groups introduced cycles that crashed production module initialization.
        // Prevent circular dependency issues
        format: 'es',
      },
      // Handle circular dependencies better
      onwarn(warning, warn) {
        // Suppress other warnings that don't affect functionality
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
      // Better handling of module dependencies and circular dependencies
      treeshake: {
        moduleSideEffects: 'no-external',
        preset: 'recommended',
      },
    },
    // Enable minification (esbuild is faster than terser)
    minify: 'esbuild',
    // Optimize source maps for production
    sourcemap: false, // Disable source maps in production for smaller bundle
    // Common chunk splitting strategy
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'axios',
      'zustand',
      'immer',
      // Don't pre-bundle recharts - let it load lazily only when admin/profile pages are accessed
      // This prevents the initialization error from breaking the main app
    ],
    // Don't force re-optimization - let Vite handle it naturally
    force: false,
    // Better handling of commonjs dependencies
    esbuildOptions: {
      target: 'es2020',
    },
  },
  // Server configuration for development
  server: {
    // Ensure proper handling of module scripts
    fs: {
      strict: false,
    },
  },
});

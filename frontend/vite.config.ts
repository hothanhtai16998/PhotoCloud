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
    // Fix recharts internal module resolution
    dedupe: ['recharts'],
  },
  build: {
    cssCodeSplit: true,
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
        // Optimized chunk splitting strategy
        manualChunks: (id) => {
          // NEVER chunk React or ReactDOM - they must stay in entry chunk
          if (
            id.includes('react') && 
            (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
          ) {
            return undefined; // Keep in entry chunk
          }

          // Note: recharts is NOT manually chunked due to internal dependency resolution issues
          // It will still be code-split naturally since it's only used in lazy-loaded admin/profile pages

          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'; // Separate icon library
          }

          // Separate UI library chunks
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }

          if (id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
            return 'vendor-state';
          }

          // Router and routing-related
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }

          // Axios and HTTP clients
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }

          // Form libraries
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'vendor-forms';
          }

          // Image processing libraries
          if (id.includes('node_modules/browser-image-compression') || id.includes('node_modules/blurhash')) {
            return 'vendor-images';
          }

          // Everything else goes into a common vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Prevent circular dependency issues
        format: 'es',
      },
      // Handle circular dependencies better
      onwarn(warning, warn) {
        // Suppress circular dependency warnings for vendor chunks
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
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
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Reduce chunk size warnings - we'll handle optimization
    chunkSizeWarningLimit: 600,
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
      // recharts excluded due to build issues - will be handled as regular dependency
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

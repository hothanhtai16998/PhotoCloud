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
        // Optimized chunking strategy to reduce unused JavaScript
        manualChunks: (id) => {
          // NEVER chunk React or ReactDOM - they must stay in entry chunk
          if (
            id.includes('react') && 
            (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
          ) {
            return undefined; // Keep in entry chunk
          }
          
          // Split vendor libraries into separate chunks for better caching and tree-shaking
          if (id.includes('node_modules')) {
            // Router libraries - used on most pages but can be code-split
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // UI libraries - only load when needed (modals, dropdowns, etc.)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Chart libraries - only used in admin (lazy load)
            // Keep recharts in vendor-misc to avoid initialization error
            // We split other libraries to keep vendor-misc under 500KB
            // if (id.includes('recharts')) {
            //   return 'vendor-charts';
            // }
            // State management - split zustand and immer
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            if (id.includes('immer')) {
              return 'vendor-immer';
            }
            // HTTP client - used everywhere but can be optimized
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            // Form libraries - only used in specific pages
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'vendor-forms';
            }
            // Toast/notification - only used when needed
            if (id.includes('sonner')) {
              return 'vendor-toast';
            }
            // Image compression - only used when uploading
            if (id.includes('browser-image-compression')) {
              return 'vendor-image';
            }
            // Socket.io - only used for real-time features
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            // Other vendor code - split further if possible
            return 'vendor-misc';
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

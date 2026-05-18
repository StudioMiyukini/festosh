import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3002,
    strictPort: true,
    host: true,
    allowedHosts: ['festosh.miyukini-home.org', 'festosh.net', 'www.festosh.net'],
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    // Manual chunking — keep heavy or stable vendor libs in their own files
    // so they cache independently of the rapidly-changing app code.
    // Vite 8 / Rolldown only accepts the function form here.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[/\\](react|react-dom|react-router-dom)[/\\]/.test(id)) return 'react';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@tanstack/react-query') || /[/\\]zustand[/\\]/.test(id)) return 'query';
          if (/react-hook-form|@hookform|[/\\]zod[/\\]/.test(id)) return 'forms';
          if (id.includes('lucide-react')) return 'icons';
          if (/dompurify|date-fns|clsx|tailwind-merge|class-variance-authority/.test(id)) return 'utils';
          // leaflet is intentionally not listed: it's only used by map pages,
          // and route-level lazy already isolates it into the map chunk.
          return undefined;
        },
      },
    },
  },
});

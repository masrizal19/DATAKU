import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    'https://oiqassfyxzwrwlkzjgyz.supabase.co'
  ).trim();

  const supabaseKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  // Support GitHub Pages base path:
  // 1. Explicit env var VITE_BASE_PATH if provided (e.g. '/dataku/' or '/')
  // 2. Or auto-detected from GITHUB_REPOSITORY (e.g. 'username/dataku' -> '/dataku/')
  // 3. Otherwise default to '/' (local dev, custom domain, or container runtime)
  const derivedBase = process.env.VITE_BASE_PATH ?? (
    process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : '/'
  );

  return {
    base: derivedBase,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

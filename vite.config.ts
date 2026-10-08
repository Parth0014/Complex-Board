import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
function distributionNotices(): Plugin {
  return {
    name: 'distribution-notices',
    generateBundle() {
      const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'public/template-photos/NOTICE.md'];
      files.push(...readdirSync('licenses').map((name) => `licenses/${name}`));
      for (const dependency of [
        'react',
        'react-dom',
        'konva',
        'react-konva',
        'scheduler',
        'react-reconciler',
      ]) {
        const folder = resolve('node_modules', dependency);
        const name = readdirSync(folder).find((name) => /^license(?:\.|$)/i.test(name));
        if (!name) throw new Error(`Missing license for ${dependency}`);
        files.push(`node_modules/${dependency}/${name}`);
      }
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_LICENSES.txt',
        source: files
          .map((file) => `===== ${file} =====\n${readFileSync(file, 'utf8')}`)
          .join('\n\n'),
      });
    },
  };
}
export default defineConfig({
  plugins: [react(), distributionNotices()],
  publicDir: false,
  server: { proxy: { '/api/ai': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/api/ai': 'http://127.0.0.1:8787' } },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (!path.includes('/node_modules/')) return;
          if (/\/(?:konva|react-konva)\//.test(path)) return 'canvas';
          if (/\/(?:react|react-dom|react-reconciler|scheduler)\//.test(path)) return 'react';
          return 'vendor';
        },
      },
    },
  },
});

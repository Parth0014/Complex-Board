import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { templateStudio } from './scripts/template-studio-plugin';
const buildId = `${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local'}-${Date.now()}`;
function deploymentVersion(): Plugin {
  return {
    name: 'deployment-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      });
    },
  };
}
function distributionNotices(): Plugin {
  return {
    name: 'distribution-notices',
    generateBundle() {
      const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md'];
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
        fileName: 'favicon.svg',
        source: readFileSync('public/favicon.svg', 'utf8'),
      });
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
// Keep authoring-only modules out of the public app, including future imports.
function makerBundleIsolation(): Plugin {
  return {
    name: 'template-maker-bundle-isolation',
    generateBundle(_options, bundle) {
      const app = Object.values(bundle).find(
        (entry) => entry.type === 'chunk' && entry.isEntry && entry.name === 'app',
      );
      if (!app || app.type !== 'chunk') throw new Error('Main app entry is missing.');
      const seen = new Set<string>();
      const visit = (file: string) => {
        if (seen.has(file)) return;
        seen.add(file);
        const chunk = bundle[file];
        if (!chunk || chunk.type !== 'chunk') return;
        for (const id of chunk.moduleIds) {
          if (
            /\/(?:studio\/TemplateStudio\.tsx|studio\/templateDrafts\.ts|templateMakerMain\.tsx)(?:\?|$)/.test(
              id.replaceAll('\\', '/'),
            )
          )
            throw new Error(`Template-maker code entered the main app bundle: ${id}`);
        }
        [...chunk.imports, ...chunk.dynamicImports].forEach(visit);
      };
      visit(app.fileName);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    distributionNotices(),
    deploymentVersion(),
    templateStudio(),
    makerBundleIsolation(),
  ],
  define: { __VISBO_BUILD_ID__: JSON.stringify(buildId) },
  publicDir: false,
  server: {
    proxy: { '/api/ai': 'http://127.0.0.1:8787', '/api/images': 'http://127.0.0.1:8787' },
  },
  preview: {
    proxy: { '/api/ai': 'http://127.0.0.1:8787', '/api/images': 'http://127.0.0.1:8787' },
  },
  build: {
    outDir: 'dist',
    manifest: true,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        templateMaker: fileURLToPath(new URL('./template-maker/index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (!path.includes('/node_modules/')) return;
          if (/\/(?:tweakpane|@tweakpane\/core)\//.test(path)) return 'tweakpane';
          if (/\/(?:konva|react-konva)\//.test(path)) return 'canvas';
          if (/\/(?:react|react-dom|react-reconciler|scheduler)\//.test(path)) return 'react';
          return 'vendor';
        },
      },
    },
  },
});

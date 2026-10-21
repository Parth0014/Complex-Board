import { mkdir, writeFile, rename, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { validateBoard } from '../src/vision/storage';

/** Local development only; no publishing endpoint is emitted into production. */
export function templateStudio(): Plugin {
  let approvalsQueue = Promise.resolve();
  return {
    name: 'local-template-studio',
    configureServer(server) {
      server.middlewares.use('/api/template-studio', async (req, res) => {
        const host = req.headers.host;
        const origin = req.headers.origin;
        const address = req.socket.remoteAddress;
        if (
          !host ||
          !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
          !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || '') ||
          (origin && origin !== `http://${host}`)
        ) {
          res.writeHead(403).end('Local access only.');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          res.end(JSON.stringify({ available: true }));
          return;
        }
        if (
          req.method !== 'POST' ||
          req.headers['content-type'] !== 'application/json' ||
          !origin
        ) {
          res.writeHead(405).end(JSON.stringify({ error: 'Use a local JSON publish request.' }));
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 40 * 1024 * 1024)
              throw new Error('Template exceeds 40 MB. Use smaller photos.');
            chunks.push(Buffer.from(chunk));
          }
          const value = JSON.parse(Buffer.concat(chunks).toString());
          if (value.action === 'approve-cutout') {
            if (
              typeof value.id !== 'string' ||
              !/^studio-cutout:[a-z0-9-]+$/.test(value.id) ||
              typeof value.approved !== 'boolean'
            )
              throw new Error('Invalid artwork selection.');
            const name = value.id.replace('studio-cutout:', '');
            const files = await readdir(resolve(server.config.root, 'src/assets/studio-cutouts'));
            if (!files.some((file) => file === name + '.svg' || file === name + '.png'))
              throw new Error('Artwork does not exist.');
            let ids: string[] = [];
            const write = approvalsQueue
              .catch(() => {})
              .then(async () => {
                const path = resolve(server.config.root, 'src/assets/approvedCutouts.json');
                const previous: string[] = JSON.parse(await readFile(path, 'utf8'));
                ids = value.approved
                  ? [...new Set([...previous, value.id])]
                  : previous.filter((id) => id !== value.id);
                await writeFile(path + '.tmp', JSON.stringify(ids.sort(), null, 2) + '\n');
                await rename(path + '.tmp', path);
              });
            approvalsQueue = write;
            await write;
            res.end(JSON.stringify({ ids }));
            return;
          }
          if (
            !/^studio-[a-zA-Z0-9-]{1,80}$/.test(value.id) ||
            typeof value.title !== 'string' ||
            !value.title.trim() ||
            value.title.length > 100 ||
            typeof value.description !== 'string' ||
            value.description.length > 400 ||
            typeof value.preview !== 'string' ||
            !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value.preview)
          )
            throw new Error('Invalid template details.');
          const { media, ...document } = value.project;
          const board = validateBoard(document);
          if (!board.items.length || board.pages?.length)
            throw new Error('Publish one non-empty page.');
          const entry = {
            id: value.id,
            title: value.title.trim(),
            description: value.description.trim(),
            preview: value.preview,
            project: { ...board, ...(media ? { media } : {}) },
          };
          const folder = resolve(server.config.root, 'src/vision/publishedTemplates');
          await mkdir(folder, { recursive: true });
          const path = resolve(folder, `${value.id}.json`);
          const temporary = path + '.tmp';
          await writeFile(temporary, JSON.stringify(entry));
          await rename(temporary, path);
          res.end(JSON.stringify({ published: true }));
        } catch (error) {
          res.writeHead(400).end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Unable to publish.',
            }),
          );
        }
      });
    },
  };
}

import { createServer } from 'node:http';
import { handleRequest } from './handler.mjs';
const port = Number(process.env.AI_PORT || 8787);
const server = createServer(handleRequest);
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Stop the previous AI server before restarting.`
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () =>
  console.log(`AI server listening on http://127.0.0.1:${port}`),
);

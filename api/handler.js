import { handleRequest } from '../server/handler.mjs';
export default async function handler(req, res) {
  const url = new URL(req.url, 'https://localhost');
  const route = url.searchParams.get('route');
  if (route) {
    url.pathname = `/api/${route}`;
    url.searchParams.delete('route');
  }
  req.url = url.pathname + url.search;
  return handleRequest(req, res);
}

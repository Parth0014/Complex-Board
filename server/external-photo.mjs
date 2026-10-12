import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
function publicAddress(address) {
  if (isIP(address) === 6)
    return !/^(::|fc|fd|fe[89ab]|ff)/i.test(address) && !address.includes('.');
  const [a, b] = address.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function externalPhoto(value, redirects = 0) {
  if (typeof value !== 'string' || value.length > 4000) throw new Error('Invalid image URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw new Error('Use a public HTTPS image link.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error('Use a public image website.');
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
        headers: { Accept: 'image/png,image/jpeg,image/webp', 'User-Agent': 'VisBo image import' },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects >= 3) return reject(new Error('Too many image redirects.'));
          externalPhoto(new URL(res.headers.location, url).href, redirects + 1).then(
            resolve,
            reject,
          );
          return;
        }
        const mime = res.headers['content-type']?.split(';')[0];
        if (res.statusCode !== 200 || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
          res.resume();
          reject(
            new Error(
              'This website did not provide a supported image. Use Copy image or upload the downloaded file.',
            ),
          );
          return;
        }
        const chunks = [];
        let size = 0;
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > 2800000) {
            res.destroy();
            reject(
              new Error('This web image is too large. Download it and upload the file instead.'),
            );
          } else chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({ image: `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}` }),
        );
        res.on('error', reject);
      },
    );
    req.setTimeout(15000, () => req.destroy(new Error('Image website timed out.')));
    req.on('error', reject);
  });
}

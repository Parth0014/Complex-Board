/** Single-page PDF with a JPEG image; byte offsets are calculated on encoded bytes. */
export function imagePdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  return imagesPdf([{ jpeg, width, height }]);
}
export function imagesPdf(
  pages: Array<{ jpeg: Uint8Array; width: number; height: number }>,
): Uint8Array {
  if (!pages.length) throw new Error('PDF needs at least one page.');
  const encoder = new TextEncoder(),
    chunks: Uint8Array[] = [],
    offsets = [0];
  let size = 0;
  const add = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    size += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = size;
    add(`${id} 0 obj\n${body}\nendobj\n`);
  };
  add('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  pages.forEach(({ jpeg, width, height }, index) => {
    const page = 3 + index * 3,
      image = page + 1,
      stream = page + 2;
    object(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width * 0.75} ${height * 0.75}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${stream} 0 R >>`,
    );
    offsets[image] = size;
    add(
      `${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    add(jpeg);
    add('\nendstream\nendobj\n');
    const content = `q ${width * 0.75} 0 0 ${height * 0.75} 0 0 cm /Im0 Do Q`;
    object(
      stream,
      `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    );
  });
  const count = 3 + pages.length * 3,
    xref = size;
  add(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) add(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const result = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}

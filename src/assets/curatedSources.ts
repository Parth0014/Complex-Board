// Bundle the local artwork with the library; no runtime module fetch is needed.
export const files = import.meta.glob('../../public/curated-v1/assets/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

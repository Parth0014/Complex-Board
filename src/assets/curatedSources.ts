// One deferred local artwork chunk; no remote providers or replacement assets.
export const files = import.meta.glob('../../public/curated-v1/assets/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

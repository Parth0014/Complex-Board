// Preserve photo placeholders in boards saved before image-reference generation was retired.
export const placeholderUrl =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e6dfd5"/><path d="M100 420l130-150 90 90 70-80 110 140z" fill="#b8afa2"/><circle cx="390" cy="180" r="40" fill="#b8afa2"/></svg>',
  );

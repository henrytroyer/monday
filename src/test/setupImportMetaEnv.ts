/** Node test bootstrap: Vite defines import.meta.env in the browser; polyfill for tsx. */
const env = new Proxy({} as Record<string, string | undefined>, {
  get: (_target, prop) => {
    if (typeof prop === 'string') return undefined;
    return undefined;
  },
});

Object.defineProperty(import.meta, 'env', {
  value: env,
  writable: true,
  configurable: true,
  enumerable: true,
});

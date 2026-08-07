/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Node `process.env` fallback used by Vite env helpers in browser + tsx scripts. */
declare const process: {
  env: Record<string, string | undefined>;
};

import '@testing-library/jest-dom/vitest';

// Polyfill matchMedia for jsdom (needed by next-themes and some shadcn bits).
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill scrollTo for layout tests.
if (typeof window !== 'undefined') {
  window.scrollTo = window.scrollTo ?? (() => undefined);
}

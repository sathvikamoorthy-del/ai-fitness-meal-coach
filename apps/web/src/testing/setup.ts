// Runs before every test file: Testing Library's DOM matchers and the browser APIs jsdom does not provide.
import '@testing-library/jest-dom';

// Suites that opt into `@jest-environment node` have no window: nothing to polyfill there.
if (typeof window !== 'undefined') {
  // Polyfills go on the window prototype, so a test that deletes the own property
  // (e.g. `delete window.matchMedia`) still falls back to them.
  const proto = Object.getPrototypeOf(window) as any;
  if (!window.matchMedia) {
    proto.matchMedia = (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
  }
  if (!(window as any).ResizeObserver) {
    proto.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!window.scrollTo || String(window.scrollTo).includes('not implemented')) window.scrollTo = (() => undefined) as typeof window.scrollTo;
}

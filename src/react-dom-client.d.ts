// Minimal ambient shim for react-dom/client until @types/react-dom is installed.
declare module 'react-dom/client' {
  import type { Container, Root, RootOptions, HydrateOptions, HydrationOptions } from 'react-dom';
  export function createRoot(container: Element | DocumentFragment, options?: RootOptions): Root;
  export function hydrateRoot(container: Element | Document, initialChildren: unknown, options?: HydrationOptions): Root;
}

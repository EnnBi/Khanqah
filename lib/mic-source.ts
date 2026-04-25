// lib/mic-source.ts
//
// Factory shim that resolves to the right MicSource implementation
// per-platform via Metro's extensionless platform-extension resolution.
// This file is the WEB fallback; mic-source.native.ts ships on Android/iOS.
export { createMicSource } from './mic.web';

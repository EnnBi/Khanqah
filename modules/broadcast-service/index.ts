import { NativeModule, requireNativeModule, EventEmitter } from 'expo-modules-core';

declare class NativeBroadcastService extends NativeModule {
  /** Acquire mic permission, configure audio session, and (Android only)
   *  start the foreground service so capture survives screen-lock. */
  startSession(): Promise<void>;

  /** Tear down audio session and (Android only) stop the foreground service. */
  stopSession(): Promise<void>;
}

const native = requireNativeModule<NativeBroadcastService>('BroadcastService');
export const events = new EventEmitter(native as any);

export default native;
export type InterruptionEvent = { state: 'began' | 'ended' };

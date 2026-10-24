export interface SnapshotStore {
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>;
    customMetadata?: Record<string, string>;
  } | null>;
  put(key: string, value: ArrayBuffer, options: {
    httpMetadata: { contentType: string };
    customMetadata: Record<string, string>;
  }): Promise<unknown>;
}

export const SPILLWAY_LATEST_KEY = "spillway/latest.jpg";


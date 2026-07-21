export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface StoragePort {
  isEnabled(): boolean;
  putObject(input: PutObjectInput): Promise<{ key: string; url: string | null }>;
  getSignedReadUrl(key: string, expiresSeconds?: number): Promise<string>;
}

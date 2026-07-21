import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import type { PutObjectInput, StoragePort } from './storage.port.js';

@Injectable()
export class CosStorageService implements StoragePort {
  private readonly client: COS | null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const secretId = config.get<string>('cos.secretId') ?? '';
    const secretKey = config.get<string>('cos.secretKey') ?? '';
    this.bucket = config.get<string>('cos.bucket') ?? '';
    this.region = config.get<string>('cos.region') ?? '';
    this.publicBaseUrl = config.get<string>('cos.publicBaseUrl') ?? '';
    this.client = secretId && secretKey && this.bucket && this.region
      ? new COS({ SecretId: secretId, SecretKey: secretKey })
      : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async putObject(input: PutObjectInput): Promise<{ key: string; url: string | null }> {
    if (!this.client) throw new ServiceUnavailableException('cos_storage_not_configured');
    await this.client.putObject({
      Bucket: this.bucket,
      Region: this.region,
      Key: input.key,
      Body: input.body as COS.PutObjectParams['Body'],
      ...(input.contentType ? { ContentType: input.contentType } : {}),
    });
    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${input.key}`
      : null;
    return { key: input.key, url };
  }

  async getSignedReadUrl(key: string, expiresSeconds = 900): Promise<string> {
    if (!this.client) throw new ServiceUnavailableException('cos_storage_not_configured');
    return this.client.getObjectUrl({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Sign: true,
      Expires: expiresSeconds,
    });
  }
}

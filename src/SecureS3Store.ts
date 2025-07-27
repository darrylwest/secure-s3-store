import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import libsodium from 'libsodium-wrappers';

// -- Configuration and Error Types --

export interface SecureS3StoreConfig {
  secretKey: string; // Hex-encoded 32-byte key (64 hex characters)
  s3Config: S3ClientConfig;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class S3Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'S3Error';
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// -- SecureS3Store Class --

export class SecureS3Store {
  private readonly s3Client: S3Client;
  private readonly secretKey: Buffer;

  constructor(private readonly config: SecureS3StoreConfig) {
    // Validate secret key
    if (!/^[0-9a-fA-F]{64}$/.test(config.secretKey)) {
      throw new ValidationError(
        'Invalid secretKey: Must be a 64-character hex string.',
      );
    }
    this.secretKey = Buffer.from(config.secretKey, 'hex');

    // Initialize S3 Client
    this.s3Client = new S3Client(config.s3Config);
  }

  async put(path: string, data: Buffer | string): Promise<void> {
    await libsodium.ready;

    const { bucket, key } = this.parsePath(path);
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    if (dataBuffer.length === 0) {
      throw new ValidationError('Data cannot be empty.');
    }

    const nonce = libsodium.randombytes_buf(
      libsodium.crypto_aead_aes256gcm_NPUBBYTES,
    );
    const ciphertext = libsodium.crypto_aead_aes256gcm_encrypt(
      dataBuffer,
      null,
      null,
      nonce,
      this.secretKey,
    );

    const finalPayload = Buffer.concat([nonce, Buffer.from(ciphertext)]);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `${key}.enc`,
      Body: finalPayload,
    });

    try {
      await this.s3Client.send(command);
    } catch (err) {
      throw new S3Error(`S3 PutObject failed: ${err.message}`);
    }
  }

  async get(path: string): Promise<Buffer> {
    await libsodium.ready;

    const { bucket, key } = this.parsePath(path);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${key}.enc`,
    });

    try {
      const { Body } = await this.s3Client.send(command);
      if (!Body) {
        throw new NotFoundError(`Object not found at path: ${path}`);
      }

      const encryptedData = await this.streamToBuffer(Body);
      const nonce = encryptedData.slice(
        0,
        libsodium.crypto_aead_aes256gcm_NPUBBYTES,
      );
      const ciphertext = encryptedData.slice(
        libsodium.crypto_aead_aes256gcm_NPUBBYTES,
      );

      const decrypted = libsodium.crypto_aead_aes256gcm_decrypt(
        ciphertext,
        null,
        null,
        nonce,
        this.secretKey,
      );

      return Buffer.from(decrypted);
    } catch (err) {
      if (err.name === 'NoSuchKey') {
        throw new NotFoundError(`Object not found at path: ${path}`);
      }
      throw new S3Error(`S3 GetObject failed: ${err.message}`);
    }
  }

  async delete(path: string): Promise<void> {
    const { bucket, key } = this.parsePath(path);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: `${key}.enc`,
    });

    try {
      await this.s3Client.send(command);
    } catch (err) {
      throw new S3Error(`S3 DeleteObject failed: ${err.message}`);
    }
  }

  async list(
    path: string,
    offset = 0,
    limit = 1000,
    recursive = false,
  ): Promise<string[]> {
    const { bucket, key: prefix } = this.parsePath(path);
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          Delimiter: recursive ? undefined : '/',
          ContinuationToken: continuationToken,
        });
        const response = await this.s3Client.send(command);
        
        if (response.Contents) {
          const keys = response.Contents.map((obj) => obj.Key || '').filter(
            (key) => key && key.endsWith('.enc'),
          ).map((key) => key.slice(0, -4));
          allKeys.push(...keys);
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return allKeys.slice(offset, offset + limit);
    } catch (err) {
      throw new S3Error(`S3 ListObjectsV2 failed: ${err.message}`);
    }
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private parsePath(path: string): { bucket: string; key: string } {
    if (!path || typeof path !== 'string') {
      throw new ValidationError('Path must be a non-empty string.');
    }

    const parts = path.split('/');
    if (parts.length < 2) {
      throw new ValidationError(
        'Invalid path format. Must be `bucket-name/key`.',
      );
    }

    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    if (!bucket || !key) {
      throw new ValidationError(
        'Invalid path format. Bucket and key must not be empty.',
      );
    }

    return { bucket, key };
  }
}

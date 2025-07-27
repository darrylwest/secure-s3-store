import { Readable } from 'stream';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import winston from 'winston';
import logger from './logger.js';

// -- Configuration and Error Types --

export interface SecureS3StoreConfig {
  secretKey: string; // Hex-encoded 32-byte key (64 hex characters)
  s3Config: S3ClientConfig;
  logger?: winston.Logger;
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

/**
 * Provides a simple, file-system-like API for securely storing and retrieving
 * encrypted data from S3-compatible object storage.
 *
 * @remarks
 * Encryption is performed using AES-256-GCM. For each `put` operation, a new
 * 16-byte Initialization Vector (IV) is generated. The final object stored in S3
 * is a concatenation of `[IV (16 bytes)][AuthTag (16 bytes)][Encrypted Data]`.
 * The authentication tag, provided by GCM, ensures data integrity and authenticity.
 */
export class SecureS3Store {
  private readonly s3Client: S3Client;
  private readonly secretKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly logger: winston.Logger;

  /**
   * Creates an instance of SecureS3Store.
   * @param config - The configuration object for the store.
   */
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
    this.logger = config.logger || logger;
    this.logger.info('SecureS3Store initialized.');
  }

  /**
   * Encrypts and uploads data to the specified S3 path.
   * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
   * @param data - The data to store, as a Buffer or a UTF-8 string.
   * @throws {ValidationError} If the path is invalid or data is empty.
   * @throws {S3Error} If the S3 upload fails.
   */
  async put(path: string, data: Buffer | string): Promise<void> {
    this.logger.info(`Attempting to put object at path: ${path}`);
    const { bucket, key } = this.parsePath(path);
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    if (dataBuffer.length === 0) {
      throw new ValidationError('Data cannot be empty.');
    }

    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const finalPayload = Buffer.concat([iv, authTag, encrypted]);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `${key}.enc`,
      Body: finalPayload,
    });

    try {
      await this.s3Client.send(command);
      this.logger.info(`Successfully put object at path: ${path}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`S3 PutObject failed for path: ${path}`, { error });
      throw new S3Error(`S3 PutObject failed: ${error.message}`);
    }
  }

  /**
   * Downloads and decrypts data from the specified S3 path.
   * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
   * @returns A Promise that resolves with the decrypted data as a Buffer.
   * @throws {NotFoundError} If the object is not found at the specified path.
   * @throws {S3Error} If the S3 download fails.
   * @throws {DecryptionError} If the data cannot be decrypted (e.g., wrong key or tampered data).
   */
  async get(path: string): Promise<Buffer> {
    this.logger.info(`Attempting to get object from path: ${path}`);
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

      const encryptedData = await this.streamToBuffer(Body as Readable);
      const iv = encryptedData.slice(0, this.ivLength);
      const authTag = encryptedData.slice(
        this.ivLength,
        this.ivLength + this.authTagLength,
      );
      const encrypted = encryptedData.slice(this.ivLength + this.authTagLength);

      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      this.logger.info(`Successfully got object from path: ${path}`);
      return decrypted;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`S3 GetObject failed for path: ${path}`, { error });
      if (error.name === 'NoSuchKey') {
        throw new NotFoundError(`Object not found at path: ${path}`);
      }
      throw new S3Error(`S3 GetObject failed: ${error.message}`);
    }
  }

  /**
   * Deletes an object from the specified S3 path.
   * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
   * @throws {S3Error} If the S3 delete operation fails.
   */
  async delete(path: string): Promise<void> {
    this.logger.info(`Attempting to delete object at path: ${path}`);
    const { bucket, key } = this.parsePath(path);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: `${key}.enc`,
    });

    try {
      await this.s3Client.send(command);
      this.logger.info(`Successfully deleted object at path: ${path}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`S3 DeleteObject failed for path: ${path}`, { error });
      throw new S3Error(`S3 DeleteObject failed: ${error.message}`);
    }
  }

  /**
   * Lists the objects within a specified bucket and prefix.
   * @param path - The S3 path to list, including the bucket and an optional prefix (e.g., `bucket-name/folder/`).
   * @param offset - The starting offset for the listing.
   * @param limit - The maximum number of items to return.
   * @param recursive - If true, lists objects in all subdirectories. If false, only lists immediate children.
   * @returns A Promise that resolves with an array of object keys.
   * @throws {S3Error} If the S3 list operation fails.
   */
  async list(
    path: string,
    offset = 0,
    limit = 1000,
    recursive = false,
  ): Promise<string[]> {
    this.logger.info(`Attempting to list objects at path: ${path}`);
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
          const keys = response.Contents.map((obj) => obj.Key || '')
            .filter((key) => key && key.endsWith('.enc'))
            .map((key) => key.slice(0, -4));
          allKeys.push(...keys);
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      this.logger.info(
        `Successfully listed ${allKeys.length} objects at path: ${path}`,
      );
      return allKeys.slice(offset, offset + limit);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`S3 ListObjectsV2 failed for path: ${path}`, { error });
      throw new S3Error(`S3 ListObjectsV2 failed: ${error.message}`);
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
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

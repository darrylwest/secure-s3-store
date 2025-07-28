import { S3ClientConfig } from '@aws-sdk/client-s3';
import { RequestHandler } from '@aws-sdk/types';
import winston from 'winston';
export interface SecureS3StoreConfig {
    keys: {
        [kid: string]: string;
    };
    primaryKey: string;
    s3Config: S3ClientConfig;
    logger?: winston.Logger;
    maxFileSize?: number;
    requestHandler?: RequestHandler<unknown, unknown, object>;
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class S3Error extends Error {
    constructor(message: string);
}
export declare class DecryptionError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
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
export declare class SecureS3Store {
    private readonly config;
    private readonly s3Client;
    private readonly keys;
    private readonly primaryKey;
    private readonly algorithm;
    private readonly ivLength;
    private readonly authTagLength;
    private readonly logger;
    private readonly maxFileSize;
    /**
     * Creates an instance of SecureS3Store.
     * @param config - The configuration object for the store.
     */
    constructor(config: SecureS3StoreConfig);
    /**
     * Encrypts and uploads data to the specified S3 path.
     * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
     * @param data - The data to store, as a Buffer or a UTF-8 string.
     * @throws {ValidationError} If the path is invalid or data is empty.
     * @throws {S3Error} If the S3 upload fails.
     */
    put(path: string, data: Buffer | string): Promise<void>;
    /**
     * Downloads and decrypts data from the specified S3 path.
     * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
     * @returns A Promise that resolves with the decrypted data as a Buffer.
     * @throws {NotFoundError} If the object is not found at the specified path.
     * @throws {S3Error} If the S3 download fails.
     * @throws {DecryptionError} If the data cannot be decrypted (e.g., wrong key or tampered data).
     */
    get(path: string): Promise<Buffer>;
    /**
     * Deletes an object from the specified S3 path.
     * @param path - The full S3 path, including bucket and key (e.g., `bucket-name/folder/file.ext`).
     * @throws {S3Error} If the S3 delete operation fails.
     */
    delete(path: string): Promise<void>;
    /**
     * Lists the objects within a specified bucket and prefix.
     * @param path - The S3 path to list, including the bucket and an optional prefix (e.g., `bucket-name/folder/`).
     * @param offset - The starting offset for the listing.
     * @param limit - The maximum number of items to return.
     * @param recursive - If true, lists objects in all subdirectories. If false, only lists immediate children.
     * @returns A Promise that resolves with an array of object keys.
     * @throws {S3Error} If the S3 list operation fails.
     */
    list(path: string, offset?: number, limit?: number, recursive?: boolean): Promise<string[]>;
    private validateInput;
    private streamToBuffer;
    static parsePath(path: string): {
        bucket: string;
        key: string;
    };
}

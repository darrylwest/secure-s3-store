# Gemini Context for `secure-s3-store`

This file summarizes the key decisions and context for the `secure-s3-store` project to ensure continuity.

## 1. Project Goal

The primary goal is to create a Node.js/TypeScript npm package that provides a simple, file-system-like API for securely storing and retrieving encrypted data from S3-compatible object storage (like AWS S3 or DigitalOcean Spaces).  A secondary goal is to create a simple express REST API to run the S3 ops.

## 2. Core API (from PRD)

The package will expose a `SecureS3Store` class with the following methods:

*   `put(path: string, data: Buffer | string): Promise<void>`: Encrypts and uploads data.
*   `get(path: string): Promise<Buffer>`: Downloads and decrypts data.
*   `delete(path: string): Promise<void>`: Deletes an object.
*   `list(path: string, recursive: boolean = true): Promise<string[]>`: Lists objects in a "folder."

The `path` string is always in the format `bucket-name/folder/filename.ext`.

## 3. Key Technical Decisions

*   **Language:** Node.js with TypeScript for type safety.
*   **Cryptography:** `libsodium-wrappers` (the official libsodium binding) will be used for encryption. Specifically, `crypto_aead_aes256gcm` for authenticated encryption.
*   **Encryption Scheme:** For each `put` operation, a new nonce will be generated. The final object stored in S3 will be a concatenation of `[nonce][encrypted_data]`.
*   **S3 Interaction:** The official `@aws-sdk/client-s3` will be used. It is compatible with S3-like services (e.g., DigitalOcean Spaces) by configuring a custom `endpoint`.
*   **Configuration:** The client will be initialized with a configuration object containing the `secretKey` (hex-encoded) and the S3 client configuration.
*   **CLI tool** Although

## 4. Development & Scaffolding

The project will be set up as a standard npm package. The initial scaffolding plan includes:

1.  `npm init -y`
2.  Install dependencies: `libsodium-wrappers`, `@aws-sdk/client-s3`.
3.  Install dev dependencies: `typescript`, `@types/node`, `ts-node`, etc.
4.  Initialize a `tsconfig.json`.
5.  Other depandencies include eslint, prettier, jest, zod, dotenvx, **logger?**
6.  The express application will run using pm2 with 3 or 4 instances

## 5. V1 Scope Limitations

*   No key rotation mechanism.
*   No built-in support for streaming/multipart uploads for very large files.
*   No direct management of advanced S3 features (e.g., bucket creation, lifecycle policies).

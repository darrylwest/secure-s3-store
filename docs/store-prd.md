## PRD: `secure-s3-store` NPM Package

### 1. Overview

**1.1. Project Goal:** To create a simple, secure, and developer-friendly npm package for storing and retrieving encrypted data from any S3-compatible object storage service (e.g., AWS S3, DigitalOcean Spaces).

**1.2. Problem Statement:** Developers often need to store sensitive data blobs (e.g., API keys, user-uploaded content, configuration files) in object storage. This requires two distinct and complex steps: robustly encrypting the data and correctly interacting with the S3 API. This package will abstract away that complexity into a single, intuitive API.

**1.3. Target Audience:** Node.js/TypeScript developers who need a simple "set and forget" solution for securely managing data in S3 without becoming experts in cryptography or the AWS SDK.

### 2. Core Features

The package will expose a class-based client that provides a simple, file-system-like interface for interacting with encrypted objects.

**2.1. Feature: Secure PUT Operation**

*   **Description:** Encrypts a given data payload and uploads it to the specified S3 path.
*   **API:** `put(path: string, data: Buffer | string): Promise<void>`
*   **User Story:** As a developer, I want to provide a path and a data buffer, and have the library automatically encrypt and store it in my S3 bucket, so I don't have to manage the encryption process.
*   **Technical Details:**
    *   The `path` will be a string in the format `bucket-name/folder/filename.ext`. The first segment is the S3 Bucket, and the rest is the S3 Key.
    *   Encryption will use `libsodium`'s `crypto_aead_aes256gcm_encrypt` function, which provides authenticated encryption (AEAD).
    *   A unique nonce will be generated for each `put` operation.
    *   The final object stored in S3 will be a concatenation of `[nonce][encrypted_data]`.
    *   The object filename will be the same as the input filename with `.enc` appended to the original, e.g. `config.json` -> `config.json.enc`

**2.2. Feature: Secure GET Operation**

*   **Description:** Downloads an object from S3 and decrypts it using the provided secret key.
*   **API:** `get(path: string): Promise<Buffer>`
*   **User Story:** As a developer, I want to request an object by its path and receive the original, decrypted data, so I can use it in my application.
*   **Technical Details:**
    *   Downloads the object from the specified S3 path.
    *   Splits the downloaded buffer into the `nonce` and the `encrypted_data`.
    *   Uses `libsodium`'s `crypto_aead_aes256gcm_decrypt` to decrypt and verify the data.
    *   If decryption fails (due to a wrong key or data tampering), the promise will be rejected with an error.
    *   Returns the original data as a `Buffer`.

**2.3. Feature: DELETE Operation**

*   **Description:** Deletes an object from the S3 bucket. This is a direct pass-through to the S3 API.
*   **API:** `delete(path: string): Promise<void>`
*   **User Story:** As a developer, I want to permanently remove an object from my bucket by its path.

**2.4. Feature: LIST Operation**

*   **Description:** Lists the keys (filenames) within a specified bucket and prefix ("folder").
*   **API:** `list(path: string, recursive: boolean = false): Promise<string[]>`
*   **User Story:** As a developer, I want to get a list of all objects stored within a specific "folder" in my bucket.
*   **Technical Details:**
    *   The `path` will be in the format `bucket-name/folder/`.
    *   Uses the S3 `ListObjectsV2` command with the specified `Bucket` and `Prefix`.
    *   Returns an array of object keys (strings).

### 3. Configuration and Initialization

The client will be initialized with a configuration object containing the secret key and S3 connection details.

```typescript
// Example Initialization
import { SecureS3Store } from 'secure-s3-store';

const store = new SecureS3Store({
  secretKey: process.env.MY_SECRET_KEY, // Hex-encoded 32-byte key
  s3Config: {
    endpoint: 'https://sfo3.digitaloceanspaces.com',
    region: 'sfo3', // region is still needed, even with a custom endpoint
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    }
  }
});
```

### 4. Technical & Non-Functional Requirements

*   **Dependencies:** `libsodium-wrappers`, `@aws-sdk/client-s3`.
*   **Security:** The user is responsible for managing the `secretKey`. The library will not store it. All cryptographic operations must use modern, secure standards (AES-256-GCM).
*   **Error Handling:** The library must throw descriptive errors for common failures (e.g., "File not found," "Decryption failed," "Invalid S3 credentials," "Invalid key format").
*   **Testing:** The package must have a comprehensive test suite, including unit tests for the crypto logic and mocked integration tests for the S3 operations.

### 5. Out of Scope (for V1)

*   **Key Rotation:** The library will not manage key rotation; the user provides a single key on initialization.
*   **CLI Tool:** This is a library/SDK, not a command-line tool.
*   **Large File Support (Multi-part Uploads):** V1 will focus on objects that can be handled in memory. Streaming and multi-part uploads can be considered for a future release.
*   **Advanced S3 Features:** Does not expose underlying S3 features like versioning, lifecycle policies, or bucket creation.

###### dpw | 2025.07.26

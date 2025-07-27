# PRD: `secure-s3-store` NPM Package

## 1. Overview

### 1.1 Project Goal

To create a simple, secure, and developer-friendly npm package for storing and retrieving encrypted data from any S3-compatible object storage service (e.g., AWS S3, DigitalOcean Spaces).

### 1.2 Problem Statement

Developers often need to store sensitive data blobs (e.g., API keys, user-uploaded content, configuration files) in object storage. This requires two distinct and complex steps: robustly encrypting the data and correctly interacting with the S3 API. This package will abstract away that complexity into a single, intuitive API.

### 1.3 Target Audience

Node.js/TypeScript developers who need a simple "set and forget" solution for securely managing data in S3 without becoming experts in cryptography or the AWS SDK.

## 2. Core Features

The package will expose a class-based client that provides a simple, file-system-like interface for interacting with encrypted objects.

### 2.1 Secure PUT Operation

**Description:** Encrypts a given data payload and uploads it to the specified S3 path.

**API:** `put(path: string, data: Buffer | string): Promise<void>`

**User Story:** As a developer, I want to provide a path and a data buffer, and have the library automatically encrypt and store it in my S3 bucket, so I don't have to manage the encryption process.

**Technical Details:**

- The `path` follows the format `bucket-name/folder/filename.ext` where the first segment is the S3 Bucket and the rest is the S3 Key
- Encryption uses `libsodium`'s `crypto_aead_aes256gcm_encrypt` function with authenticated encryption (AEAD)
- A unique 12-byte nonce is generated for each operation using `crypto_aead_aes256gcm_npubbytes()`
- The final object stored in S3 is a concatenation of `[nonce(12 bytes)][encrypted_data]`
- The stored object filename has `.enc` appended (e.g., `config.json` → `config.json.enc`)
- String data is converted to Buffer using UTF-8 encoding before encryption

### 2.2 Secure GET Operation

**Description:** Downloads an object from S3 and decrypts it using the provided secret key.

**API:** `get(path: string): Promise<Buffer>`

**User Story:** As a developer, I want to request an object by its original path and receive the decrypted data, so I can use it in my application.

**Technical Details:**

- The `path` parameter uses the original filename (without `.enc` suffix)
- Automatically appends `.enc` to locate the encrypted file in S3
- Downloads the object and splits the buffer: first 12 bytes as nonce, remainder as encrypted data
- Uses `libsodium`'s `crypto_aead_aes256gcm_decrypt` to decrypt and verify the data
- Returns the original data as a Buffer
- Throws `DecryptionError` if decryption fails due to wrong key or data tampering

### 2.3 DELETE Operation

**Description:** Deletes an encrypted object from the S3 bucket.

**API:** `delete(path: string): Promise<void>`

**User Story:** As a developer, I want to permanently remove an object from my bucket by its original path.

**Technical Details:**
- Accepts the original filename (without `.enc` suffix)
- Automatically appends `.enc` to locate the encrypted file
- Direct pass-through to S3 `DeleteObject` command

### 2.4 LIST Operation

**Description:** Lists the original filenames within a specified bucket and prefix.

**API:** `list(path: string, offset: int = 0, limit: int = 1000, recursive: boolean = false): Promise<string[]>`

**User Story:** As a developer, I want to get a list of all objects stored within a specific folder in my bucket.

**Technical Details:**

- The `path` format is `bucket-name/folder/` (trailing slash optional)
- Uses S3 `ListObjectsV2` command with specified Bucket and Prefix
- Filters results to only `.enc` files and removes the suffix from returned names
- Returns original filenames (without `.enc` suffix)
- If `recursive` is false, only lists immediate children; if true, lists all nested objects
- Results are paginated automatically for large result sets (>1000 objects)

## 3. API Reference

### 3.1 Class Definition

```typescript
class SecureS3Store {
  constructor(config: SecureS3StoreConfig);
  put(path: string, data: Buffer | string): Promise<void>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  list(path: string, recursive?: boolean): Promise<string[]>;
}
```

### 3.2 Configuration Interface

```typescript
interface SecureS3StoreConfig {
  secretKey: string; // Hex-encoded 32-byte key (64 hex characters)
  s3Config: {
    endpoint?: string; // Optional for custom S3-compatible services
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}
```

### 3.3 Error Types

```typescript
class ValidationError extends Error {
  // Thrown for invalid inputs (malformed paths, invalid keys, etc.)
}

class S3Error extends Error {
  // Thrown for S3-related issues (network, credentials, permissions)
}

class DecryptionError extends Error {
  // Thrown when decryption fails (wrong key, corrupted data)
}

class NotFoundError extends Error {
  // Thrown when requested object doesn't exist
}
```

## 4. Configuration and Initialization

```typescript
import { SecureS3Store } from 'secure-s3-store';

const store = new SecureS3Store({
  secretKey: process.env.MY_SECRET_KEY, // 64-character hex string
  s3Config: {
    endpoint: 'https://sfo3.digitaloceanspaces.com', // Optional
    region: 'sfo3',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    }
  }
});

// Usage examples
await store.put('my-bucket/configs/app.json', JSON.stringify(config));
const data = await store.get('my-bucket/configs/app.json');
const files = await store.list('my-bucket/configs/');
await store.delete('my-bucket/configs/old-config.json');
```

## 5. Validation Rules

### 5.1 Path Validation

- Must follow format `bucket-name/path/to/file.ext`
- Bucket name must be valid S3 bucket name (3-63 characters, lowercase, no spaces)
- Total path length cannot exceed 1024 characters
- Cannot contain null bytes or control characters

### 5.2 Secret Key Validation

- Must be exactly 64 hexadecimal characters (representing 32 bytes)
- Validated during initialization using regex: `/^[0-9a-fA-F]{64}$/`

### 5.3 Data Size Limits

- Maximum object size: 100MB (in-memory processing limitation)
- Minimum object size: 1 byte

### 5.4 S3 Configuration Validation

- Credentials and region are validated during first operation
- Connection test performed during initialization (optional `validateConnection` flag)

## 6. Security Considerations

- **Key Management:** Users are responsible for securely generating, storing, and rotating encryption keys
- **Key Generation:** Recommend using `crypto.randomBytes(32).toString('hex')` for key generation
- **Environment Variables:** Store keys in environment variables, never in code
- **Network Security:** Always use HTTPS endpoints for S3 communication
- **Data Integrity:** AES-256-GCM provides both encryption and authentication
- **Nonce Uniqueness:** Each operation generates a cryptographically secure random nonce

## 7. Technical Requirements

### 7.1 Dependencies

- `libsodium-wrappers` - Cryptographic operations
- `@aws-sdk/client-s3` - S3 API interactions

### 7.2 TypeScript Support

- Full TypeScript definitions included
- Generic type support for typed data retrieval
- Strict typing for all configuration options

### 7.3 Error Handling

- All operations use Promise-based error handling
- Descriptive error messages with context
- Proper error classification using custom error types
- Network retry logic for transient S3 errors

### 7.4 Testing Requirements

- Unit tests for all cryptographic operations
- Mocked integration tests for S3 operations
- End-to-end tests with real S3 service (optional)
- Test coverage minimum: 90%
- Performance benchmarks for encrypt/decrypt operations

### 7.5 Performance Characteristics

- In-memory processing (suitable for objects up to 100MB)
- Average encryption overhead: ~16 bytes (12-byte nonce + 16-byte auth tag)
- Typical operation latency depends on S3 service and object size

## 8. Out of Scope (Version 1)

- **Key Rotation:** Library does not manage key rotation; users must handle key lifecycle
- **Large File Support:** No streaming or multi-part upload support for files >100MB
- **Advanced S3 Features:** No exposure of versioning, lifecycle policies, or bucket management
- **Compression:** No built-in compression before encryption
- **REST Interface:** Express REST API wrapper deferred to future version
- **Cross-Region Replication:** No built-in support for multi-region storage
- **Backup/Recovery:** No automated backup or recovery mechanisms

## 9. Future Considerations

- Express.js REST interface for language-agnostic access
- Streaming support for large files
- Built-in key rotation mechanisms
- Compression options
- Multi-region storage support
- CLI tool for manual operations

---

**Document Version:** 1.1  
**Author:** dpw  
**Date:** 2025.07.26  
**Status:** Ready for Development

###### dpw | 2025.07.26

# Alternate Readme

GitHub Copilot: # SecureS3Store Documentation

## Overview

SecureS3Store is a TypeScript library that provides secure object storage using AWS S3 with AES-256-GCM encryption. It handles encryption/decryption transparently while managing S3 operations.

## Installation

```bash
npm install secure-s3-store
```

## Key Features

- AES-256-GCM encryption
- Transparent encryption/decryption
- Secure IV and auth tag handling
- Comprehensive error handling
- TypeScript support
- Configurable logging

## Configuration

### SecureS3StoreConfig Interface

```typescript
interface SecureS3StoreConfig {
  secretKey: string;     // 64-character hex string (32 bytes)
  s3Config: S3ClientConfig;
  logger?: winston.Logger;
}
```

### Initialization

```typescript
import { SecureS3Store } from 'secure-s3-store';

const store = new SecureS3Store({
  secretKey: '64characterhexstring...',
  s3Config: {
    region: 'us-west-2',
    credentials: {
      accessKeyId: 'YOUR_ACCESS_KEY',
      secretAccessKey: 'YOUR_SECRET_KEY'
    }
  }
});
```

## API Reference

### Put Object

```typescript
async put(path: string, data: Buffer | string): Promise<void>
```

Encrypts and stores data in S3.

### Get Object

```typescript
async get(path: string): Promise<Buffer>
```

Retrieves and decrypts data from S3.

### Delete Object

```typescript
async delete(path: string): Promise<void>
```

Deletes an encrypted object from S3.

### List Objects

```typescript
async list(
  path: string,
  offset = 0,
  limit = 1000,
  recursive = false
): Promise<string[]>
```
Lists encrypted objects in the specified path.

## Path Format

Paths must be formatted as `bucket-name/key/path`:
- `bucket-name`: S3 bucket name
- `key/path`: Object key/path within the bucket

## Error Types

### ValidationError

Thrown when input validation fails.

### S3Error

Thrown when AWS S3 operations fail.

### DecryptionError

Thrown when decryption fails.

### NotFoundError

Thrown when an object is not found.

## Security Details

### Encryption

- Algorithm: AES-256-GCM
- IV Length: 16 bytes
- Auth Tag Length: 16 bytes
- Key Format: 32-byte hex-encoded string

### Data Format
Encrypted data is stored in the following format:
```
[IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data]
```

## Example Usage

```typescript
// Initialize store
const store = new SecureS3Store(config);

// Store encrypted data
await store.put('my-bucket/secret.txt', 'sensitive data');

// Retrieve and decrypt data
const data = await store.get('my-bucket/secret.txt');

// List encrypted objects
const files = await store.list('my-bucket/folder', 0, 10);

// Delete encrypted object
await store.delete('my-bucket/secret.txt');
```

## Best Practices

1. Securely manage your encryption keys
2. Use environment variables for AWS credentials
3. Implement proper error handling
4. Monitor logging output
5. Regularly rotate encryption keys
6. Use secure communication channels (HTTPS)

## Limitations

- Maximum file size depends on S3 limits
- No streaming support for large files
- Single encryption key per instance
- No built-in key rotation

## Contributing

Contributions are welcome! Please see our contributing guidelines for details.

## License

Apache License, Version 2.0, January 2004

###### dpw | 2025-07-27 18:04:33

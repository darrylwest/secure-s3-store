# Secure S3 Store

A simple, secure, and developer-friendly npm package for storing and retrieving encrypted data from any S3-compatible object storage service (e.g., AWS S3, DigitalOcean Spaces).

This library abstracts away the complexity of encrypting data and interacting with the S3 API into a single, intuitive, file-system-like interface.

## Features

-   **Transparent Encryption**: Automatically encrypts data on `put` and decrypts on `get` using AES-256-GCM.
-   **S3-Compatible**: Works with AWS S3, DigitalOcean Spaces, MinIO, and other S3-compatible services.
-   **Simple API**: Provides `put`, `get`, `delete`, and `list` methods for easy object management.
-   **Configurable Logging**: Uses Winston for logging, which can be configured or replaced by your application's logger.
-   **TypeScript Support**: Written in TypeScript with full type definitions.

## Installation

```bash
npm install secure-s3-store
```

## Usage

Here is a basic example of how to use `SecureS3Store`:

```typescript
import { SecureS3Store, SecureS3StoreConfig } from 'secure-s3-store';

async function main() {
  // Configuration for the store
  const config: SecureS3StoreConfig = {
    secretKey: process.env.SALT_PIPE_KEY!, // Your 64-character hex-encoded secret key
    s3Config: {
      endpoint: 'https://sfo3.digitaloceanspaces.com', // e.g., for DigitalOcean
      region: 'sfo3',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    },
  };

  // Create a new store instance
  const store = new SecureS3Store(config);

  const myData = 'This is a secret message!';
  const myPath = 'my-bucket/my-folder/secret.txt';

  try {
    // 1. Store and encrypt the data
    await store.put(myPath, myData);
    console.log('Successfully stored and encrypted the file.');

    // 2. Retrieve and decrypt the data
    const retrievedData = await store.get(myPath);
    console.log('Decrypted data:', retrievedData.toString('utf8')); // Outputs: This is a secret message!

    // 3. Delete the data
    await store.delete(myPath);
    console.log('Successfully deleted the file.');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
```

## Configuration

The `SecureS3Store` is initialized with a configuration object with the following properties:

-   `secretKey` (string, required): A **64-character** hexadecimal string representing a 32-byte encryption key.
-   `s3Config` (object, required): An S3 client configuration object, passed directly to the `@aws-sdk/client-s3` constructor. See the [AWS S3 Client documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/classes/_aws_sdk_client_s3.S3Client.html) for all available options.
-   `logger` (object, optional): A `winston` logger instance. If not provided, a default logger (console and rotating file) will be used.

### Logging

This library uses `winston` for logging. You can customize the logging by creating your own logger and passing it in the configuration.

```typescript
import { configureLogger } from 'secure-s3-store/logger';

// Create a custom logger (e.g., only log to the console at the 'debug' level)
const myLogger = configureLogger({
  consoleLogLevel: 'debug',
  fileLogLevel: 'warn', // Only write warnings and errors to the file
});

const config: SecureS3StoreConfig = {
  // ... other config
  logger: myLogger,
};

const store = new SecureS3Store(config);
```

## Development and Examples

For a complete, working example of how to use this library, please see the end-to-end test located at [`e2e/e2e-test.ts`](./e2e/e2e-test.ts). This test demonstrates the full lifecycle of storing, retrieving, listing, and deleting an object and is a great reference for getting started.
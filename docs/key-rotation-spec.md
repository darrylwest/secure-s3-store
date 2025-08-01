# Key Rotation Specification for `secure-s3-store`

## 1. Overview

This document outlines the implementation plan for adding key rotation capabilities to the `secure-s3-store` library. The primary goal is to allow users to change their encryption keys over time without losing access to data encrypted with older keys. This will be achieved by embedding a Key Identifier (KID) into the stored data, making each object self-describing in terms of the key required for its decryption.

## 2. Updated Configuration

The `SecureS3StoreConfig` interface will be updated to support multiple keys and to designate one key as the primary for new encryption operations.

### `SecureS3StoreConfig` Interface

```typescript
interface SecureS3StoreConfig {
  /**
   * An object containing one or more encryption keys, where the key is a
   * Key Identifier (KID) and the value is the 64-character hex-encoded secret key.
   */
  keys: { [kid: string]: string };

  /**
   * The Key Identifier (KID) of the key that should be used for all new
   * encryption operations. This KID must exist in the `keys` object.
   */
  primaryKey: string;

  s3Config: S3ClientConfig;
  logger?: winston.Logger;
  maxFileSize?: number;
  requestHandler?: RequestHandler<unknown, unknown, object>;
}
```

### Example Configuration

```typescript
const config: SecureS3StoreConfig = {
  keys: {
    'v1': '1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a', // Old key
    'v2': '2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b', // Current primary key
  },
  primaryKey: 'v2',
  s3Config: {
    // ... S3 configuration
  },
};
```

## 3. New Storage Format

To support key rotation, the format of the data blob stored in S3 will be updated to include the KID.

The new format will be a concatenation of the following parts:

`[KID Length (1 byte)][KID (UTF-8)][IV (16 bytes)][AuthTag (16 bytes)][Encrypted Data]`

### Format Breakdown

1.  **KID Length**: A single byte representing the length of the KID string in bytes. This allows for KIDs up to 255 characters long.
2.  **KID**: The Key Identifier string, encoded in UTF-8.
3.  **IV**: The 16-byte Initialization Vector used for AES-GCM encryption.
4.  **AuthTag**: The 16-byte authentication tag generated by AES-GCM to ensure data integrity.
5.  **Encrypted Data**: The actual ciphertext.

## 4. Updated Method Logic

### `put` Method

1.  The `put` method will identify the primary key to use for encryption by looking up `config.primaryKey` in the `config.keys` object.
2.  The KID of the primary key will be retrieved (e.g., `"v2"`).
3.  The data will be encrypted as usual using the primary key.
4.  Before uploading to S3, the final payload will be constructed by prepending the KID and its length to the IV, AuthTag, and ciphertext, following the new storage format.

### `get` Method

1.  The `get` method will download the entire object from S3.
2.  It will first read the **first byte** to determine the length of the KID.
3.  It will then read the next `n` bytes (where `n` is the length from the first byte) to extract the KID string.
4.  Using this extracted KID, it will look up the corresponding secret key in the `config.keys` object.
5.  If the KID is not found in the `config.keys` object, a `DecryptionError` will be thrown.
6.  If the key is found, it will be used to decrypt the remainder of the payload (IV + AuthTag + Encrypted Data).

## 5. Benefits of this Approach

-   **Seamless Key Rotation**: Users can introduce new keys and retire old ones without any service interruption. To rotate, a user adds a new key to the `keys` object and updates the `primaryKey` setting.
-   **Zero Downtime**: The system remains fully operational during key rotation. New data is encrypted with the new primary key, while existing data remains accessible and can be decrypted with its corresponding old key.
-   **Flexibility**: Using variable-length strings for KIDs allows for human-readable and meaningful identifiers (e.g., `"v1"`, `"key-for-user-data"`, `"2025-q4-key"`).
-   **Backwards Compatibility**: This approach ensures that data encrypted with older keys remains readable as long as those keys are present in the configuration.

###### dpw | 2025.07.27

// test/SecureS3Store.test.ts
import { S3Client } from '@aws-sdk/client-s3';
import {
  SecureS3Store,
  ValidationError,
  DecryptionError,
} from '../src/SecureS3Store.js';
import { Readable } from 'stream';

jest.mock('@aws-sdk/client-s3');

describe('SecureS3Store', () => {
  const mockS3Client = S3Client as jest.Mock;
  const mockSend = jest.fn();

  beforeEach(() => {
    mockS3Client.mockClear();
    mockSend.mockClear();
    mockS3Client.mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should throw an S3Error when the delete operation fails', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });
    mockSend.mockRejectedValue(new Error('S3 Error'));
    await expect(store.delete('my-bucket/my-key')).rejects.toThrow(
      'S3 DeleteObject failed: S3 Error',
    );
  });

  it('should throw an S3Error when the list operation fails', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });
    mockSend.mockRejectedValue(new Error('S3 Error'));
    await expect(store.list('my-bucket/my-folder/')).rejects.toThrow(
      'S3 ListObjectsV2 failed: S3 Error',
    );
  });

  it('should throw a DecryptionError for an unknown KID', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });

    const kid = Buffer.from('v2', 'utf8');
    const kidLength = Buffer.from([kid.length]);
    const iv = Buffer.alloc(16, 0);
    const authTag = Buffer.alloc(16, 0);
    const encrypted = Buffer.from('encrypted-data');
    const body = Buffer.concat([kidLength, kid, iv, authTag, encrypted]);

    mockSend.mockResolvedValue({ Body: Readable.from(body) });

    await expect(store.get('my-bucket/my-key')).rejects.toThrow(
      DecryptionError,
    );
  });

  describe('parsePath', () => {
    it.each([
      ['bucket/'],
      ['/key'],
      ['bucket'],
      [''],
      [null],
      [undefined],
      [123],
    ])('should throw a ValidationError for invalid path: %s', (path) => {
      // @ts-expect-error: Testing invalid input types
      expect(() => SecureS3Store.parsePath(path)).toThrow(ValidationError);
    });

    it('should correctly parse a valid path', () => {
      const { bucket, key } = SecureS3Store.parsePath(
        'my-bucket/my-folder/my-file.txt',
      );
      expect(bucket).toBe('my-bucket');
      expect(key).toBe('my-folder/my-file.txt');
    });
  });
});

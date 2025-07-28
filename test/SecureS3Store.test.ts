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

  it('should put and get a value', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });

    const originalData = 'Hello, Secure World!';
    const path = 'my-bucket/my-key';

    // Mock the put operation
    mockSend.mockResolvedValueOnce({});

    await store.put(path, originalData);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const putCommand = mockSend.mock.calls[0][0];
    expect(putCommand.input.Bucket).toBe('my-bucket');
    expect(putCommand.input.Key).toBe('my-key.enc');

    // The body is a buffer with kid, iv, authTag, and encrypted data.
    // We can't easily decrypt it here, so we'll just check that it's a buffer.
    expect(putCommand.input.Body).toBeInstanceOf(Buffer);

    // Mock the get operation
    const bodyStream = Readable.from(putCommand.input.Body);
    mockSend.mockResolvedValueOnce({ Body: bodyStream });

    const retrievedData = await store.get(path);
    expect(retrievedData.toString('utf8')).toBe(originalData);
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

  it('should delete a value', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });
    const path = 'my-bucket/my-key';

    mockSend.mockResolvedValueOnce({});

    await store.delete(path);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const deleteCommand = mockSend.mock.calls[0][0];
    expect(deleteCommand.input.Bucket).toBe('my-bucket');
    expect(deleteCommand.input.Key).toBe('my-key.enc');
  });

  it('should list values', async () => {
    const store = new SecureS3Store({
      keys: { v1: 'a'.repeat(64) },
      primaryKey: 'v1',
      s3Config: {},
    });
    const path = 'my-bucket/my-folder/';

    const s3Objects = {
      Contents: [
        { Key: 'my-folder/file1.txt.enc' },
        { Key: 'my-folder/file2.txt.enc' },
      ],
    };
    mockSend.mockResolvedValueOnce(s3Objects);

    const result = await store.list(path);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const listCommand = mockSend.mock.calls[0][0];
    expect(listCommand.input.Bucket).toBe('my-bucket');
    expect(listCommand.input.Prefix).toBe('my-folder/');
    expect(result).toEqual(['my-folder/file1.txt', 'my-folder/file2.txt']);
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

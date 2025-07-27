// test/SecureS3Store.test.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { SecureS3Store, ValidationError } from '../src/SecureS3Store.js';
import { Readable } from 'stream';
import { SdkStream } from '@aws-sdk/types';

// Create a mock stream that satisfies the SdkStream type
const createMockStream = (content: Buffer): SdkStream<Readable> => {
  const stream = Readable.from(content);
  return Object.assign(stream, {
    transformToByteArray: () => Promise.resolve(new Uint8Array(content)),
    transformToString: () => Promise.resolve(content.toString()),
    transformToWebStream: () => {
      throw new Error('not implemented');
    },
  });
};

describe('SecureS3Store', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
  });

  it('should encrypt and upload data with the correct parameters', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });

    s3Mock.on(PutObjectCommand).resolves({});

    await store.put('my-bucket/my-key', 'my-data');

    const putObjectCalls = s3Mock.calls();
    expect(putObjectCalls).toHaveLength(1);
    const callInput = putObjectCalls[0].args[0]
      .input as PutObjectCommand['input'];
    expect(callInput.Bucket).toBe('my-bucket');
    expect(callInput.Key).toBe('my-key.enc');
    expect(callInput.Body).toBeInstanceOf(Buffer);
  });

  it('should download and decrypt data', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });

    // Create a fake encrypted payload
    const iv = Buffer.alloc(16, 0);
    const authTag = Buffer.alloc(16, 0);
    const encrypted = Buffer.from('encrypted-data');
    const body = Buffer.concat([iv, authTag, encrypted]);

    s3Mock.on(GetObjectCommand).resolves({
      Body: createMockStream(body),
    });

    // This will fail decryption, but we are just testing the S3 call
    await expect(store.get('my-bucket/my-key')).rejects.toThrow();

    const getObjectCalls = s3Mock.calls();
    expect(getObjectCalls).toHaveLength(1);
    const callInput = getObjectCalls[0].args[0]
      .input as GetObjectCommand['input'];
    expect(callInput.Bucket).toBe('my-bucket');
    expect(callInput.Key).toBe('my-key.enc');
  });

  it('should delete an object with the correct parameters', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });

    s3Mock.on(DeleteObjectCommand).resolves({});

    await store.delete('my-bucket/my-key');

    const deleteObjectCalls = s3Mock.calls();
    expect(deleteObjectCalls).toHaveLength(1);
    const callInput = deleteObjectCalls[0].args[0]
      .input as DeleteObjectCommand['input'];
    expect(callInput.Bucket).toBe('my-bucket');
    expect(callInput.Key).toBe('my-key.enc');
  });

  it('should list objects with the correct parameters', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: 'my-folder/my-key1.enc' },
        { Key: 'my-folder/my-key2.enc' },
      ],
    });

    const result = await store.list('my-bucket/my-folder/');

    const listObjectsCalls = s3Mock.calls();
    expect(listObjectsCalls).toHaveLength(1);
    const callInput = listObjectsCalls[0].args[0]
      .input as ListObjectsV2Command['input'];
    expect(callInput.Bucket).toBe('my-bucket');
    expect(callInput.Prefix).toBe('my-folder/');
    expect(result).toEqual(['my-folder/my-key1', 'my-folder/my-key2']);
  });

  // Error handling tests
  it('should throw a ValidationError for an invalid secret key', () => {
    expect(() => {
      new SecureS3Store({
        secretKey: 'invalid-key',
        s3Config: {},
      });
    }).toThrow(ValidationError);
  });

  it('should throw a ValidationError for an invalid path', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });
    await expect(store.put('invalid-path', 'my-data')).rejects.toThrow(
      ValidationError,
    );
  });

  it('should throw an S3Error when the put operation fails', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });
    s3Mock.on(PutObjectCommand).rejects(new Error('S3 Error'));
    await expect(store.put('my-bucket/my-key', 'my-data')).rejects.toThrow(
      'S3 PutObject failed: S3 Error',
    );
  });

  it('should throw a NotFoundError when the get operation fails with NoSuchKey', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });
    s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
    await expect(store.get('my-bucket/my-key')).rejects.toThrow(
      'Object not found at path: my-bucket/my-key',
    );
  });
});

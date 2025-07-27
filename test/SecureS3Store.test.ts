// test/SecureS3Store.test.ts
import { S3Client } from '@aws-sdk/client-s3';
import { SecureS3Store, ValidationError } from '../src/SecureS3Store.js';

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
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });
    mockSend.mockRejectedValue(new Error('S3 Error'));
    await expect(store.delete('my-bucket/my-key')).rejects.toThrow(
      'S3 DeleteObject failed: S3 Error',
    );
  });

  it('should throw an S3Error when the list operation fails', async () => {
    const store = new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
    });
    mockSend.mockRejectedValue(new Error('S3 Error'));
    await expect(store.list('my-bucket/my-folder/')).rejects.toThrow(
      'S3 ListObjectsV2 failed: S3 Error',
    );
  });

  it.each([['bucket/'], ['/key'], ['bucket'], [''], [null]])(
    'should throw a ValidationError for invalid path: %s',
    async (path) => {
      const store = new SecureS3Store({
        secretKey: 'a'.repeat(64),
        s3Config: {},
      });
      // @ts-expect-error: Testing invalid input types
      await expect(store.put(path, 'my-data')).rejects.toThrow(ValidationError);
    },
  );
});

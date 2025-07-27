// test/SecureS3Store.test.ts
import { S3Client } from '@aws-sdk/client-s3';
import { SecureS3Store } from '../src/SecureS3Store.js';
import { RequestHandler } from '@aws-sdk/types';

jest.mock('@aws-sdk/client-s3');

describe('SecureS3Store', () => {
  const mockS3Client = S3Client as jest.Mock;

  beforeEach(() => {
    mockS3Client.mockClear();
  });

  it('should pass the requestHandler to the S3Client', () => {
    const mockRequestHandler = {
      handle: jest.fn(),
    };

    new SecureS3Store({
      secretKey: 'a'.repeat(64),
      s3Config: {},
      requestHandler: mockRequestHandler as unknown as RequestHandler<
        unknown,
        unknown,
        object
      >,
    });

    expect(mockS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        requestHandler: mockRequestHandler,
      }),
    );
  });
});

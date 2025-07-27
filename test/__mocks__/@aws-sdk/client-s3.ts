// test/__mocks__/@aws-sdk/client-s3.ts
export const S3Client = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
}));
export const PutObjectCommand = jest.fn();
export const GetObjectCommand = jest.fn();
export const DeleteObjectCommand = jest.fn();
export const ListObjectsV2Command = jest.fn();

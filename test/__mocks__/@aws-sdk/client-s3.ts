// test/__mocks__/@aws-sdk/client-s3.ts
export const S3Client = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
}));

function mockCommand(
  this: Record<string, unknown>,
  input: Record<string, unknown>,
) {
  this.input = input;
}

export const PutObjectCommand = jest.fn().mockImplementation(mockCommand);
export const GetObjectCommand = jest.fn().mockImplementation(mockCommand);
export const DeleteObjectCommand = jest.fn().mockImplementation(mockCommand);
export const ListObjectsV2Command = jest.fn().mockImplementation(mockCommand);

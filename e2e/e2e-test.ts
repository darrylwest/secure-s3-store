// e2e/e2e-test.ts

import 'dotenvx/config';
import { SecureS3Store, SecureS3StoreConfig } from '../src/SecureS3Store';

const BUCKET = process.env.BUCKET!;

const config: SecureS3StoreConfig = {
  secretKey: process.env.SALT_PIPE_KEY!,
  s3Config: {
    endpoint: `https://sfo3.digitaloceanspaces.com`,
    region: 'sfo3',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  },
};

const store = new SecureS3Store(config);

async function main() {
  console.log('Starting e2e test for SecureS3Store...');

  try {
    const testData = `Hello, world! This is a test. ${new Date().toISOString()}`;
    const testPath = `${BUCKET}/test-folder/test-file.txt`;
    const testDataBuffer = Buffer.from(testData, 'utf8');

    // 1. Put
    console.log(`Putting data to ${testPath}...`);
    await store.put(testPath, testDataBuffer);
    console.log('Put successful.');

    // 2. Get
    console.log(`Getting data from ${testPath}...`);
    const retrievedData = await store.get(testPath);
    if (!retrievedData.equals(testDataBuffer)) {
      throw new Error('Retrieved data does not match original data.');
    }
    console.log('Get successful and data verified.');

    // 3. List
    console.log('Listing objects...');
    const files = await store.list(`${BUCKET}/test-folder/`);
    if (!files.includes('test-folder/test-file.txt')) {
      throw new Error('List does not contain the uploaded file.');
    }
    console.log('List successful and file found.');

    // 4. Delete
    console.log(`Deleting data from ${testPath}...`);
    await store.delete(testPath);
    console.log('Delete successful.');

    // 5. Verify deletion
    try {
      await store.get(testPath);
      // If get succeeds, it's an error because the file should be deleted
      throw new Error('Verification failed: File still exists after deletion.');
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        console.log('Verification successful: File is confirmed deleted.');
      } else {
        throw error; // Re-throw other errors
      }
    }

    console.log('All e2e tests passed!');
  } catch (error) {
    console.error('E2E test failed:', error);
    process.exit(1);
  }
}

main();

// e2e/e2e-test.ts

import { SecureS3Store, SecureS3StoreConfig } from '../src/SecureS3Store.js';
import { configureLogger } from '../src/logger.js';

const BUCKET = process.env.BUCKET!;

const logger = configureLogger({
  consoleLogLevel: 'error',
  fileLogLevel: 'info',
});

const keys: { [kid: string]: string } = {};
if (process.env.KEY_V1) {
  keys.v1 = process.env.KEY_V1;
}
if (process.env.KEY_V2) {
  keys.v2 = process.env.KEY_V2;
}

const config: SecureS3StoreConfig = {
  keys,
  primaryKey: process.env.PRIMARY_KEY || 'v1',
  s3Config: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  },
  logger,
};

const store = new SecureS3Store(config);

async function main() {
  console.log('Starting e2e test for SecureS3Store...');

  try {
    const folder = 'system';
    const filename = 'e2e-test-file.txt';
    const testData = `Hello, world! aabbccddeeffgghhrrlzz This is a new test. ${new Date().toISOString()}`;
    const testPath = `${BUCKET}/${folder}/${filename}`;
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
    console.log(`Get successful and data verified: ${retrievedData}`);

    // 3. List
    console.log('Listing objects...');
    const files = await store.list(`${BUCKET}/${folder}/`);
    if (!files.includes(`${folder}/${filename}`)) {
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

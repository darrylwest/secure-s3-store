"use strict";
// e2e/e2e-test.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenvx/config");
const SecureS3Store_1 = require("../src/SecureS3Store");
const BUCKET = 'gemini-secure-s3-store-test';
const config = {
    secretKey: process.env.MY_SECRET_KEY,
    s3Config: {
        endpoint: `https://sfo3.digitaloceanspaces.com`,
        region: 'sfo3',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
        },
    },
};
const store = new SecureS3Store_1.SecureS3Store(config);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting e2e test for SecureS3Store...');
        try {
            const testData = `Hello, world! This is a test. ${new Date().toISOString()}`;
            const testPath = `${BUCKET}/test-folder/test-file.txt`;
            const testDataBuffer = Buffer.from(testData, 'utf8');
            // 1. Put
            console.log(`Putting data to ${testPath}...`);
            yield store.put(testPath, testDataBuffer);
            console.log('Put successful.');
            // 2. Get
            console.log(`Getting data from ${testPath}...`);
            const retrievedData = yield store.get(testPath);
            if (!retrievedData.equals(testDataBuffer)) {
                throw new Error('Retrieved data does not match original data.');
            }
            console.log('Get successful and data verified.');
            // 3. List
            console.log('Listing objects...');
            const files = yield store.list(`${BUCKET}/test-folder/`);
            if (!files.includes('test-folder/test-file.txt')) {
                throw new Error('List does not contain the uploaded file.');
            }
            console.log('List successful and file found.');
            // 4. Delete
            console.log(`Deleting data from ${testPath}...`);
            yield store.delete(testPath);
            console.log('Delete successful.');
            // 5. Verify deletion
            try {
                yield store.get(testPath);
                // If get succeeds, it's an error because the file should be deleted
                throw new Error('Verification failed: File still exists after deletion.');
            }
            catch (error) {
                if (error.name === 'NotFoundError') {
                    console.log('Verification successful: File is confirmed deleted.');
                }
                else {
                    throw error; // Re-throw other errors
                }
            }
            console.log('All e2e tests passed!');
        }
        catch (error) {
            console.error('E2E test failed:', error);
            process.exit(1);
        }
    });
}
main();
//# sourceMappingURL=e2e-test.js.map
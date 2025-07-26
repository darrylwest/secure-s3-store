# Using the AWS SDK with DigitalOcean Spaces

Yes, the AWS SDK is fully compatible with DigitalOcean Spaces.

Spaces is designed to be an S3-compatible object storage service, which means it uses the same API as AWS S3. The only change you need to make in your code is to specify the DigitalOcean endpoint URL when you create the S3 client.

### How to Configure the AWS SDK for DigitalOcean Spaces

You'll provide a custom `endpoint` in the `S3Client` configuration. The endpoint URL is typically in the format `https://<region>.digitaloceanspaces.com`.

Your Spaces access keys (which you can generate in the DigitalOcean control panel) are used for authentication. You can provide them via the same environment variables the AWS SDK looks for: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

### Updated Code Example for DigitalOcean Spaces

Here is an example of what the code would look like in TypeScript, modified to work with DigitalOcean Spaces:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "fs";
import { Readable } from "stream";

// --- Configuration for DigitalOcean Spaces ---

// The region of your DO Space, e.g., "nyc3", "sfo3"
const region = process.env.DO_SPACES_REGION; 
// The endpoint for your DO Space
const endpoint = `https://${region}.digitaloceanspaces.com`;

// Your DO Spaces access key and secret key
// The SDK will automatically pick these up from the environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Create an S3 client configured for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: endpoint,
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  }
});

// --- UPLOAD AND DOWNLOAD FUNCTIONS (No changes needed here) ---

async function uploadFile(bucket: string, key: string, filePath: string) {
  try {
    const fileStream = createReadStream(filePath);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
    });
    // The 'send' command uses the client configured above
    const response = await s3Client.send(command);
    console.log("File uploaded successfully:", response);
    return response;
  } catch (err) {
    console.error("Error uploading file:", err);
  }
}

async function downloadFile(bucket: string, key: string, downloadPath: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await s3Client.send(command);

    if (response.Body instanceof Readable) {
      const writer = createWriteStream(downloadPath);
      response.Body.pipe(writer);
      console.log(`File download started to ${downloadPath}`);
    }
  } catch (err) {
    console.error("Error downloading file:", err);
  }
}

// --- Example Usage ---
// const spaceName = "my-digital-ocean-space-name";
// uploadFile(spaceName, "my-remote-file.txt", "./local-file.txt");
// downloadFile(spaceName, "my-remote-file.txt", "./downloaded-file.txt");
```

In summary: **Yes, it's fully compatible.** You just point the official AWS SDK at the DigitalOcean endpoint, and everything else works the same.

# Re-implementing in Node.js/TypeScript

Re-implementing this in Node.js with TypeScript would be relatively straightforward. The core logic is simple, and the Node.js ecosystem has mature libraries for everything you're doing in C++.

The main challenge would be swapping the C++ build system (CMake, etc.) for the Node.js/TypeScript toolchain (`npm`, `tsc`).

### Core Components in Node.js/TypeScript

1.  **Cryptography (`libsodium`):** The `libsodium-wrappers` package is the official JavaScript/TypeScript binding for `libsodium`. It provides the same cryptographic functions.
2.  **Reading from `stdin` / Writing to `stdout`:** Node.js is built for this. You'd use the global `process.stdin` and `process.stdout` streams, which is very idiomatic for Node.js CLIs.
3.  **CLI Argument Parsing:** Instead of manual parsing, you'd use a library like `yargs` or `commander` to handle `--encrypt` and `--decrypt` flags.
4.  **Environment Variables (`.env`):** The `dotenv` package is the standard for loading variables from `.env` files.

### Project Setup Plan

If you wanted to proceed, here's how you could set it up:

1.  **Initialize a Node.js project:**
    ```bash
    npm init -y
    ```

2.  **Install dependencies:**
    ```bash
    # Runtime dependencies
    npm install libsodium-wrappers dotenv yargs

    # Development dependencies
    npm install -D typescript @types/node @types/yargs ts-node
    ```

3.  **Initialize TypeScript:**
    ```bash
    npx tsc --init --rootDir src --outDir dist --sourceMap --declaration
    ```
    This creates a `tsconfig.json` file for you.

4.  **Create the main source file (`src/main.ts`):**
    The logic would look something like this (a high-level sketch):

    ```typescript
    import sodium from 'libsodium-wrappers';
    import dotenv from 'dotenv';
    import yargs from 'yargs';
    import { hideBin } from 'yargs/helpers';

    // Load .env file
    dotenv.config();

    async function main() {
      const argv = await yargs(hideBin(process.argv))
        .option('encrypt', { type: 'boolean', description: 'Encrypt stdin' })
        .option('decrypt', { type: 'boolean', description: 'Decrypt stdin' })
        .conflicts('encrypt', 'decrypt')
        .parse();

      const key = process.env.SALT_PIPE_KEY;
      if (!key) {
        console.error('Error: SALT_PIPE_KEY environment variable is not set.');
        process.exit(1);
      }

      // Wait for libsodium to be ready
      await sodium.ready;
      const keyBytes = Buffer.from(key, 'hex');

      // Read all data from stdin
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const input = Buffer.concat(chunks);

      let output: Buffer;

      if (argv.encrypt) {
        const nonce = sodium.randombytes_buf(sodium.crypto_aead_aes256gcm_NPUBBYTES);
        const ciphertext = sodium.crypto_aead_aes256gcm_encrypt(input, null, null, nonce, keyBytes);
        output = Buffer.concat([nonce, ciphertext]);
      } else if (argv.decrypt) {
        const nonce = input.slice(0, sodium.crypto_aead_aes256gcm_NPUBBYTES);
        const ciphertext = input.slice(sodium.crypto_aead_aes256gcm_NPUBBYTES);
        output = Buffer.from(sodium.crypto_aead_aes256gcm_decrypt(ciphertext, null, null, nonce, keyBytes));
      } else {
        console.error('Error: You must specify either --encrypt or --decrypt.');
        process.exit(1);
      }

      process.stdout.write(output);
    }

    main().catch(err => {
      console.error('An error occurred:', err.message);
      process.exit(1);
    });
    ```

### Difficulty Assessment

*   **Overall Difficulty:** Low to moderate.
*   **Main Challenge:** The primary shift is from a synchronous, compiled language to an asynchronous, JIT-compiled one. The main new concept would be handling the `async`/`await` nature of Node.js, especially for I/O and the `sodium.ready` promise.
*   **Benefit:** You would gain the simplicity of `npm` for package management and a more portable, less build-intensive development workflow.

# Improvements for Version 1.0.3


Based on the "Out of Scope" section of the original PRD, here are the most logical next steps for a major new version:


* Suggestion 1: Streaming Support for Large Files: The current implementation reads the entire file into memory for encryption and decryption. For large files, this is inefficient. We could refactor the put and get methods to use Node.js streams. This would involve piping the S3 stream through a crypto
 stream, making the library capable of handling files of any size with a minimal memory footprint.


* Suggestion 2: Key Rotation: The current design uses a single, static secret key. For enhanced security, applications should rotate their encryption keys periodically. We could implement a key rotation strategy, for example, by prefixing the encrypted data with a key identifier. The library could then be
 configured with multiple keys and would automatically use the correct one for decryption based on the prefix.


These suggestions would make the library more robust, professional, and significantly more powerful for a wider range of use cases.

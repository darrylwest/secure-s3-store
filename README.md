# Secure S3 Store

```
 _______                                _______ ______   _______ __                    
|     __|.-----.----.--.--.----.-----. |     __|__    | |     __|  |_.-----.----.-----.
|__     ||  -__|  __|  |  |   _|  -__| |__     |__    | |__     |   _|  _  |   _|  -__|
|_______||_____|____|_____|__| |_____| |_______|______| |_______|____|_____|__| |_____|
                                                                                       
```

## e2e Tests

The end-to-end test script performs a full lifecycle test of the SecureS3Store's core functionality.  Here's a step-by-step breakdown:

   1. Initialization: It creates an instance of the SecureS3Store using credentials and configuration from your .env file.
   2. PUT Operation: It creates a unique piece of test data and uploads it to a specified path in your S3 bucket using the store.put() method. This tests the encryption and upload process.
   3. GET Operation & Verification: It immediately retrieves the same object using store.get(). It then verifies that the decrypted data is identical to the original data that was uploaded, ensuring the encryption and decryption process is working correctly.
   4. LIST Operation: It lists the contents of the "folder" where the test file was uploaded using store.list() and confirms that the newly created file appears in the list.
   5. DELETE Operation: It deletes the test object from the bucket using store.delete().
   6. Deletion Verification: To confirm the deletion was successful, it attempts to get() the object again. The test is designed to catch a NotFoundError, which is the expected outcome. If the object is successfully retrieved (meaning it wasn't deleted) or if a different error occurs, the test fails.


In short, the script tests the put, get, list, and delete methods in a sequence to ensure they all work together as expected against a real S3-compatible service.

###### dpw | 2025.07.26


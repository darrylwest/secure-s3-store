// types/libsodium-wrappers.d.ts
declare module 'libsodium-wrappers' {
  export * from 'libsodium-wrappers/dist/modules/libsodium-wrappers';
  export const ready: Promise<void>;
  export function randombytes_buf(size: number): Uint8Array;
  export const crypto_aead_aes256gcm_NPUBBYTES: number;
  export function crypto_aead_aes256gcm_encrypt(
    message: Uint8Array,
    additionalData: Uint8Array | null,
    secretNonce: Uint8Array | null,
    nonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array;
  export function crypto_aead_aes256gcm_decrypt(
    ciphertext: Uint8Array,
    additionalData: Uint8Array | null,
    secretNonce: Uint8Array | null,
    nonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array;
}

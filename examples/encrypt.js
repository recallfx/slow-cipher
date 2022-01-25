/* eslint-env node */
import { randomHex, encrypt, decrypt } from '../src';

const message = 'some secret message';
const key = randomHex();
const iv = randomHex();
const salt = randomHex();
const stepCount = 500;

(async () => {
  // compute key and encrypt
  const result = await encrypt(message, key, iv, salt, stepCount, 0);

  console.log('cipherText', result.cipherText);

  // will compute key from the start and then decrypt
  const originalMessage = await decrypt(result.cipherText, key, iv, salt, stepCount, 0);
  console.log('originalMessage', originalMessage);

  // if you have saved computedKeyHex, then it will be very fast to encrypt/decrypt
  const resultFast = await encrypt(message, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);

  const fastOriginalMessage = await decrypt(
    resultFast.cipherText,
    result.computedKeyHex,
    iv,
    salt,
    stepCount,
    stepCount - 1,
  );
  console.log('fastOriginalMessage', fastOriginalMessage);
})();

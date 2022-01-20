import slowCipher from '../src/index.js';

const message = 'some secret message';
const key = slowCipher.randomHex();
const iv = slowCipher.randomHex();
const salt = slowCipher.randomHex();
const stepCount = 500; // about 30s

(async () => {
  // compute key and encrypt
  const result = await slowCipher.encrypt(message, key, iv, salt, stepCount, 0);

  console.log('cipherText', result.cipherText);

  // will compute key from the start and then decrypt
  const originalMessage = await slowCipher.decrypt(result.cipherText, key, iv, salt, stepCount, 0);
  console.log('originalMessage', originalMessage);

  // if you have saved computedKeyHex, then it will be very fast to encrypt/decrypt
  const resultFast = await slowCipher.encrypt(message, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);

  const fastOriginalMessage = await slowCipher.decrypt(resultFast.cipherText, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);
  console.log('fastOriginalMessage', fastOriginalMessage);
})()


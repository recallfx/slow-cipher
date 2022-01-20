import CryptoJs from 'crypto-js';
import AES from 'crypto-js/aes';
import { pbkdf2 } from 'fast-sha256';

import { hexToArray, arrayToHex, hexToWords, wordsToHex } from './utils';

const encodingDefaults = {
  rounds: 1000,
  dkLen: 512,
};

// avoid issues on node environment
const requestAnimationFrameCb = typeof window !== 'undefined' ? requestAnimationFrame : ((cb) => cb());

export function randomHex(length = 512) {
  const words = CryptoJs.lib.WordArray.random(length);

  return wordsToHex(words);
}

function computePBKDF2(value, salt, rounds, dkLen) {
  // same function from CryptoJs is 10x slower
  const computedKey = pbkdf2(value, salt, rounds, dkLen);

  // returns UInt8Array
  return computedKey;
}

// very long operation to stall before final step
export async function computeKey(keyHex, saltHex, stepCount, startIndex, callback, options = {}) {
  const actual = Object.assign({}, encodingDefaults, options);
  const key = hexToArray(keyHex);
  const salt = hexToArray(saltHex);

  const start = performance.now();
  let i = 0;

  const computeKeyStep = (value, index, resolve) => {
    const computedKey = computePBKDF2(value, salt, actual.rounds, actual.dkLen);

    const now = performance.now();
    i += 1;

    const remainingIterations = stepCount - i;
    const elapsedSeconds = (now - start) / 1000 || 1;
    const iterationsPerSecond = i / elapsedSeconds;
    const remainingTime = remainingIterations / iterationsPerSecond;

    // for better animation quality, does not affect speed
    requestAnimationFrameCb(() => {
      callback({
        remainingTime,
        iterationsPerSecond,
        index,
        computedKeyHex: arrayToHex(computedKey),
        force: false,
      });
    });

    if (index < stepCount - 1) {
      setTimeout(() => {
        computeKeyStep(computedKey, index + 1, resolve);
      }, 0);
    } else {
      callback({
        remainingTime: 0,
        iterationsPerSecond,
        index,
        computedKeyHex: arrayToHex(computedKey),
        force: true,
      });
      resolve(computedKey);
    }
  };

  const computedKey = await new Promise((resolve) => {
    if (startIndex < stepCount - 1) {
      computeKeyStep(key, startIndex, resolve);
    } else {
      resolve(key);
    }
  });

  return arrayToHex(computedKey);
}

export function encryptWithComputedKey(message, computedKeyHex, iv, saltHex) {
  // Encrypt
  const cipherResult = AES.encrypt(message + saltHex, hexToWords(computedKeyHex), {
    iv,
    mode: CryptoJs.mode.CFB,
    padding: CryptoJs.pad.AnsiX923,
  });

  return cipherResult.toString();
}

export async function encrypt(message, keyHex, ivHex, saltHex, stepCount, startIndex, callback, options = {}) {
  const iv = CryptoJs.enc.Hex.parse(ivHex);

  const computedKeyHex = await computeKey(
    keyHex,
    saltHex,
    stepCount,
    startIndex,
    (data) => callback && callback({ ...data, keyHex, ivHex, saltHex, stepCount, startIndex }),
    options,
  );

  const cipherText = encryptWithComputedKey(message, computedKeyHex, iv, saltHex);

  return { computedKeyHex, cipherText };
}

export function decryptWithComputedKey(cipherText, computedKeyHex, iv, saltHex) {
  // Decrypt
  const bytes = AES.decrypt(cipherText, hexToWords(computedKeyHex), {
    iv,
    mode: CryptoJs.mode.CFB,
    padding: CryptoJs.pad.AnsiX923,
  });

  return bytes.toString(CryptoJs.enc.Latin1).replace(saltHex, '');
}

export async function decrypt(cipherText, keyHex, ivHex, saltHex, stepCount, startIndex, callback, options = {}) {
  const iv = CryptoJs.enc.Hex.parse(ivHex);

  const computedKeyHex = await computeKey(
    keyHex,
    saltHex,
    stepCount,
    startIndex,
    (data) => callback && callback({ ...data, keyHex, ivHex, saltHex, stepCount, startIndex }),
    options,
  );

  return decryptWithComputedKey(cipherText, computedKeyHex, iv, saltHex);
}

/* eslint-env browser,node */

import WordArray from 'crypto-js/lib-typedarrays';
import Hex from 'crypto-js/enc-hex';
import Latin1 from 'crypto-js/enc-latin1';
import AES from 'crypto-js/aes';
import CFB from 'crypto-js/mode-cfb';
import { pbkdf2 } from 'fast-sha256';
import throttle from 'lodash/throttle';

import { hexToArray, arrayToHex, hexToWords, wordsToHex } from './utils';

const encodingDefaults = {
  rounds: 1000,
  dkLen: 512,
};

// This is a copy of crypto-js/pad-ansix923 because it is not properly imported
const AnsiX923 = {
  pad(data, blockSize) {
    // Shortcuts
    const dataSigBytes = data.sigBytes;
    const blockSizeBytes = blockSize * 4;

    // Count padding bytes
    const nPaddingBytes = blockSizeBytes - (dataSigBytes % blockSizeBytes);

    // Compute last byte position
    const lastBytePos = dataSigBytes + nPaddingBytes - 1;

    // Pad
    data.clamp();
    // eslint-disable-next-line no-param-reassign,no-bitwise
    data.words[lastBytePos >>> 2] |= nPaddingBytes << (24 - (lastBytePos % 4) * 8);
    // eslint-disable-next-line no-param-reassign
    data.sigBytes += nPaddingBytes;
  },

  unpad(data) {
    // Get number of padding bytes from last byte
    // eslint-disable-next-line no-bitwise
    const nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

    // Remove padding
    // eslint-disable-next-line no-param-reassign
    data.sigBytes -= nPaddingBytes;
  },
};

// avoid issues on node environment and throttle requestAnimationFrame or callback execution
const callbackHandler = typeof window !== 'undefined' ? requestAnimationFrame : (cb) => cb();
const callbackHandlerThrottled = throttle(callbackHandler, 100);

export function randomHex(length = 512) {
  const words = WordArray.random(length / 8);

  return wordsToHex(words);
}

// very long operation to stall before final step
export async function computeKey(keyHex, saltHex, stepCount, startIndex, callback = () => {}, options = {}) {
  const actual = { ...encodingDefaults, ...options };
  const key = hexToArray(keyHex);
  const salt = hexToArray(saltHex);

  const start = performance.now();
  let i = 0;

  const computeKeyStep = (value, index, resolve) => {
    // same function from CryptoJs is 10x slower. Note that this function takes dkLen as bits.
    const computedKey = pbkdf2(value, salt, actual.rounds, actual.dkLen / 8);
    const now = performance.now();
    i += 1;

    const remainingIterations = stepCount - i;
    const elapsedSeconds = (now - start) / 1000 || 1;
    const iterationsPerSecond = i / elapsedSeconds;
    const remainingTime = remainingIterations / iterationsPerSecond;

    // for better animation quality, does not affect speed
    callbackHandlerThrottled(() => {
        callback({
          remainingTime,
          iterationsPerSecond,
          index: index + 1,
          computedKeyHex: arrayToHex(computedKey),
          force: index + 1 === stepCount,
        });
      });

    if (index + 1 < stepCount) {
      setTimeout(() => {
        computeKeyStep(computedKey, index + 1, resolve);
      }, 0);
    } else {
      callbackHandlerThrottled.flush();
      resolve(computedKey);
    }
  };

  const computedKey = await new Promise((resolve) => {
    if (startIndex < stepCount) {
      computeKeyStep(key, startIndex, resolve);
    } else {
      resolve(key);
    }
  });

  return arrayToHex(computedKey);
}

export function encryptWithComputedKey(message, computedKeyHex, ivHex, saltHex) {
  // Encrypt
  const cipherResult = AES.encrypt(message + saltHex, hexToWords(computedKeyHex), {
    iv: Hex.parse(ivHex),
    mode: CFB,
    padding: AnsiX923,
  });

  return cipherResult.toString();
}

export async function encrypt(message, keyHex, ivHex, saltHex, stepCount, startIndex, callback, options = {}) {
  if (keyHex.length < 1 || keyHex.length !== ivHex.length || keyHex.length !== saltHex.length) {
    throw new Error('Arguments: key, iv and salt, must match length');
  }

  const computedKeyHex = await computeKey(
    keyHex,
    saltHex,
    stepCount,
    startIndex,
    (data) => callback && callback({ ...data, keyHex, ivHex, saltHex, stepCount, startIndex }),
    options,
  );

  const cipherText = encryptWithComputedKey(message, computedKeyHex, ivHex, saltHex);

  return { computedKeyHex, cipherText };
}

export function decryptWithComputedKey(cipherText, computedKeyHex, ivHex, saltHex) {
  // Decrypt
  const bytes = AES.decrypt(cipherText, hexToWords(computedKeyHex), {
    iv: Hex.parse(ivHex),
    mode: CFB,
    padding: AnsiX923,
  });

  return bytes.toString(Latin1).replace(saltHex, '');
}

export async function decrypt(cipherText, keyHex, ivHex, saltHex, stepCount, startIndex, callback, options = {}) {
  if (keyHex.length < 1 || keyHex.length !== ivHex.length || keyHex.length !== saltHex.length) {
    throw new Error('Arguments: key, iv and salt, must match length');
  }

  const computedKeyHex = await computeKey(
    keyHex,
    saltHex,
    stepCount,
    startIndex,
    (data) => callback && callback({ ...data, keyHex, ivHex, saltHex, stepCount, startIndex }),
    options,
  );

  return decryptWithComputedKey(cipherText, computedKeyHex, ivHex, saltHex);
}

/* eslint-env mocha */
import assert from 'assert';
import { randomHex, computeKey, encryptWithComputedKey, encrypt, decryptWithComputedKey, decrypt } from '../src';

const secretMessage = 'some secret message';
const keyHex =
  'ffbcf8227070e1771253eb43bae6d4d6755fe85ab351294cf60c960e79ce909e37edf32cdcfa31646aa530bc16e11a4de3ebb73d620a02005d14e403f88fcc7b';
const ivHex =
  'ee9d3b29d8a59806769136c20e996a0e2d676750e4bc3d084ca3ddcd21c8caa5ad08c5af544862d8d7914bee6f41f9612f171024432eeda08ffd470dc874bb8c';
const saltHex =
  'ea09f696d42e87c9019c47f49a09ab0640042d8f60724d920f26e91783f2bc24ec952143ecf1aa19d65183a898d40c9f5b27ecfa477b408e70c7c5fa010de514';
const keyResult =
  'ccb996b0d20ba6306fb9da32cd2ff39bd5157079f272f6cc40494377f5b1b2b9ad8eabc9e7338068304441576861ab471c75b998c67c5c7d4b810e2042f4f2f5';
const keyResultPartial =
  'e6131ee2de024e6325ffef867e3ffb25bb966cf2a80cbcc83d041e6d91d4c0eb3761d79ac337b23792a37d6130dfaf18531dc785aeaecb881b9171d9c96fec3c';
const encryptedMessage =
  'NKhFttNKxCsb7g+zAYUECtJP66ULM3Oegjv/xefS7n/ATPBO4ZQqEA6cJkTQapm414QRADFsOuhj3dmxQ2mLh6/jG6fYwd4CFGhjumd5wnynKL5z4o8pxZp3I+6Mxj5UNYLjX7BbCkZVe45ELsXTc4wzKnBIQaujygtWfCudk7nkK5Q8G4KDW98OPsWvOsLnJRe1k1y8i7vMkjJkcbI/Pg==';
describe('slow-cipher', () => {
  const getHexCount = (bitCount) => (bitCount / 8) * 2;

  describe('randomHex', () => {
    it('returns random 512bit hex by default', () => {
      const bitCount = 512;

      const hex1 = randomHex();
      const hex2 = randomHex();

      assert.notDeepEqual(hex1, hex2);
      assert.deepEqual(hex1.length, getHexCount(bitCount));
    });

    it('returns random 64bit hex', () => {
      const bitCount = 64;

      const hex1 = randomHex(bitCount);
      const hex2 = randomHex(bitCount);

      assert.notDeepEqual(hex1, hex2);
      assert.deepEqual(hex1.length, getHexCount(bitCount));
    });
  });

  describe('computeKey', () => {
    it('computes key with 3 iterations and default options', async () => {
      const result = await computeKey(keyHex, saltHex, 3, 0);

      assert.deepEqual(result.length, getHexCount(512));
      assert.deepEqual(result, keyResult);
    });

    it('computes key with 2 iterations', async () => {
      const result = await computeKey(keyHex, saltHex, 2, 0);

      assert.deepEqual(result, keyResultPartial);
    });

    it('continue compute key with 3 iterations from index 2', async () => {
      const result = await computeKey(keyResultPartial, saltHex, 3, 2);

      assert.deepEqual(result, keyResult);
    });

    it('skip compute key with 0 iterations', async () => {
      let result = await computeKey(keyHex, saltHex, 0, 0);

      assert.deepEqual(result, keyHex);

      result = await computeKey(keyHex, saltHex, 10, 10);

      assert.deepEqual(result, keyHex);
    });

    it('calls callback with proper data', async () => {
      let data;
      const index = 2;

      const callback = (cbData) => {
        data = cbData;
      };

      const result = await computeKey(keyResultPartial, saltHex, 3, index, callback);

      assert.ok(data.iterationsPerSecond > 0);
      assert.ok(data.remainingTime > 0);
      assert.deepEqual(data.force, true);
      assert.deepEqual(data.index, index + 1);
      assert.deepEqual(data.computedKeyHex, keyResult);
      assert.deepEqual(result, keyResult);
    });

    it('supports custom options', async () => {
      const options = {
        rounds: 1000,
        dkLen: 128,
      };
      const result = await computeKey(keyHex, saltHex, 1, 0, () => {}, options);

      assert.deepEqual(result.length, getHexCount(options.dkLen));
      assert.deepEqual(result, 'b86735d2e042a24cb13027488d8b7913');
    });
  });

  describe('encryptWithComputedKey', () => {
    it('encrypts message with computed key', () => {
      const result = encryptWithComputedKey(secretMessage, keyResult, ivHex, saltHex);

      assert.deepEqual(result, encryptedMessage);
    });
  });

  describe('decryptWithComputedKey', () => {
    it('decrypts encrypted message with computed key', () => {
      const result = decryptWithComputedKey(encryptedMessage, keyResult, ivHex, saltHex);

      assert.deepEqual(result, secretMessage);
    });

    it('does not decrypt garbage', () => {
      const result = decryptWithComputedKey('garbage', keyResult, ivHex, saltHex);

      assert.deepEqual(result, '');
    });
  });

  describe('encrypt', () => {
    it('computes key with 3 iterations and default options, and encrypts message', async () => {
      const { cipherText, computedKeyHex } = await encrypt(secretMessage, keyHex, ivHex, saltHex, 3, 0);

      assert.deepEqual(cipherText, encryptedMessage);
      assert.deepEqual(computedKeyHex, keyResult);
    });

    it('calls callback with proper datae', async () => {
      let data;
      const index = 2;
      const stepCount = 3;

      const callback = (cbData) => {
        data = cbData;
      };

      const { computedKeyHex } = await encrypt(
        secretMessage,
        keyResultPartial,
        ivHex,
        saltHex,
        stepCount,
        index,
        callback,
      );

      assert.ok(data.iterationsPerSecond > 0);
      assert.ok(data.remainingTime > 0);
      assert.deepEqual(data.force, true);
      assert.deepEqual(data.index, index + 1);
      assert.deepEqual(data.keyHex, keyResultPartial);
      assert.deepEqual(data.ivHex, ivHex);
      assert.deepEqual(data.saltHex, saltHex);
      assert.deepEqual(data.stepCount, stepCount);
      assert.deepEqual(data.startIndex, index);
      assert.deepEqual(data.computedKeyHex, keyResult);
      assert.deepEqual(computedKeyHex, keyResult);
    });

    it('supports custom options', async () => {
      const options = {
        rounds: 1000,
        dkLen: 256,
      };
      const { cipherText, computedKeyHex } = await encrypt(
        secretMessage,
        keyHex.substring(0, 64),
        ivHex.substring(0, 64),
        saltHex.substring(0, 64),
        1,
        0,
        () => {},
        options,
      );

      assert.deepEqual(computedKeyHex.length, getHexCount(options.dkLen));
      assert.deepEqual(computedKeyHex, '69c46734ea6ccf5298ac070dcf450d8c3aa5bdd97f9acf1a445893aa56505a79');
      assert.deepEqual(
        cipherText,
        'AxkO1J22Rjbn8Jo4lesmaeqtNi+zfG8l5vIBcNALJPhe84jxKDU8HGWjlXpPbodKwrKGQ2g8dqGu4r75il+MHMa9V301V+rgYaB7x8cMLCv3mBxcU7h2GwIJS8oBfDvv',
      );
    });
  });

  describe('decrypt', () => {
    it('computes key with 3 iterations and default options, and decrypts encrypted message', async () => {
      const message = await decrypt(encryptedMessage, keyHex, ivHex, saltHex, 3, 0);

      assert.deepEqual(message, secretMessage);
    });

    it('calls callback with proper datae', async () => {
      let data;
      const index = 2;
      const stepCount = 3;

      const callback = (cbData) => {
        data = cbData;
      };

      const message = await decrypt(encryptedMessage, keyResultPartial, ivHex, saltHex, stepCount, index, callback);

      assert.ok(data.iterationsPerSecond > 0);
      assert.ok(data.remainingTime > 0);
      assert.deepEqual(data.force, true);
      assert.deepEqual(data.index, index + 1);
      assert.deepEqual(data.keyHex, keyResultPartial);
      assert.deepEqual(data.ivHex, ivHex);
      assert.deepEqual(data.saltHex, saltHex);
      assert.deepEqual(data.stepCount, stepCount);
      assert.deepEqual(data.startIndex, index);
      assert.deepEqual(data.computedKeyHex, keyResult);
      assert.deepEqual(message, secretMessage);
    });

    it('supports custom options', async () => {
      const options = {
        rounds: 1000,
        dkLen: 256,
      };
      const message = await decrypt(
        'AxkO1J22Rjbn8Jo4lesmaeqtNi+zfG8l5vIBcNALJPhe84jxKDU8HGWjlXpPbodKwrKGQ2g8dqGu4r75il+MHMa9V301V+rgYaB7x8cMLCv3mBxcU7h2GwIJS8oBfDvv',
        keyHex.substring(0, 64),
        ivHex.substring(0, 64),
        saltHex.substring(0, 64),
        1,
        0,
        () => {},
        options,
      );

      assert.deepEqual(message, secretMessage);
    });
  });
});

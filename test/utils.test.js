/* eslint-env mocha */
import assert from 'assert';
import { hexToArray, arrayToHex, wordsToHex, hexToWords } from '../src/utils';

describe('utils.js', () => {
  it('converts hex to Uint8Array', () => {
    const hex = 'ff00f0';
    const result = hexToArray(hex);

    assert.ok(result instanceof Uint8Array);
    assert.deepEqual(result.at(0), 255);
    assert.deepEqual(result.at(1), 0);
    assert.deepEqual(result.at(2), 240);
    assert.deepEqual(result.length, 3);
  });

  it('converts Uint8Array to hex', () => {
    const array = new Uint8Array(3);
    array[0] = 240;
    array[1] = 0;
    array[2] = 255;

    const result = arrayToHex(array);

    assert.deepEqual(result, 'f000ff');
  });

  it('converts hex to WordsArray', () => {
    const hex = 'ff00f0';
    const result = hexToWords(hex);

    assert.ok(result.words instanceof Array);
    assert.deepEqual(result.sigBytes, 3);
  });

  it('converts WordsArray to hex', () => {
    const wordsArray = { words: [-16715776], sigBytes: 3 };

    const result = wordsToHex(wordsArray);

    assert.deepEqual(result, 'ff00f0');
  });
});

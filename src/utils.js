import Hex from 'crypto-js/enc-hex';

export const hexToArray = (hexString) => new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export const arrayToHex = (bytes) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export function wordsToHex(words) {
  const hex = Hex.stringify(words);

  return hex;
}

export function hexToWords(hex) {
  const words = Hex.parse(hex);

  return words;
}

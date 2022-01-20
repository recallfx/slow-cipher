#! /usr/bin/env node --experimental-modules --es-module-specifier-resolution=node
import * as slowCipher from '../src/slow-cipher';

const params = process.argv.slice(3);
const functionName = process.argv[2];

if (!functionName) {
  console.error('Function name not provided i.e. run-func-esm default');
  process.exit();
}

if (!slowCipher[functionName]) {
  throw new Error(`Function ${functionName} is not present or exported from module.`);
}
const result = slowCipher[functionName](...params);

if (result) {
  console.log(result);
}
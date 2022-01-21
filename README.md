# Slow Cipher

A combination of AES and PBKDF2 (Password-Based Key Derivation Function 2) methods that is designed to take some time before it is possible to decrypt a secret message.

One particular use case could be anonymous delayed secret message store, that is revealed after some time of doing calculations.

Since it takes long time to encode the key, it is safe to keep initial keys within container, an example can be generated 


Check out [demo](https://recallfx.github.io/slow-cipher/)
## Install

```
yarn add slow-cipher
```

## Encrypt/Decrypt Example

Run using command: `node --es-module-specifier-resolution=node examples/encrypt.js`

```
import slowCipher from 'slow-cipher';

const message = 'some secret message';
const key = slowCipher.randomHex();
const iv = slowCipher.randomHex();
const salt = slowCipher.randomHex();
const stepCount = 500; // about 30s

// compute key and encrypt will take about 30s based on stepCount
const result = await slowCipher.encrypt(message, key, iv, salt, stepCount, 0);

console.log('cipherText', result.cipherText);

// compute key from the start and decrypt, will take same amount of time as encrypt method
const originalMessage = await slowCipher.decrypt(result.cipherText, key, iv, salt, stepCount, 0);
console.log('originalMessage', originalMessage);

// if you have saved computedKeyHex, then it will be very fast to encrypt/decrypt
const resultFast = await slowCipher.encrypt(message, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);

const fastOriginalMessage = await slowCipher.decrypt(resultFast.cipherText, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);
console.log('fastOriginalMessage', fastOriginalMessage);
```

## View Example

First run `yarn build`.

Run using command: `node --es-module-specifier-resolution=node examples/view.js`.

```
import slowCipher from 'slow-cipher';

slowCipher.slowCipherView('#root', uuid, cipherText, keyHex, saltHex, ivHex, stepCount);
```

Make self executable and save to file:

```
import fs from 'fs';

const cipherText = '<cipherText>';
const key = '<key>';
const iv = '<iv>';
const salt = '<salt>';
const stepCount = 500; 

let script = fs.readFileSync('./dist/view.js').toString();;
const exportIndex = script.lastIndexOf('export');
script = script.substring(0, exportIndex);
script = `
(() => {
  ${script}
  ;
  const rootEl = document.createElement('div');
  rootEl.id = 'view_someUUID';
  rootEl.style.cssText = 'position: fixed; top: 50px;';

  document.body.append(rootEl);
  window.slowCipherView('view_someUUID', 'someUUID', '${cipherText}', '${key}', '${salt}', '${iv}', ${stepCount});
})()
`

fs.writeFileSync('view_browser.js', script);
```
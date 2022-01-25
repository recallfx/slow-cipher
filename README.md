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
import { randomHex, encrypt, decrypt } from 'slow-cipher';

const message = 'some secret message';
const key = randomHex();
const iv = randomHex();
const salt = randomHex();
const stepCount = 500; // about 30s

// compute key and encrypt will take about 30s based on stepCount
const result = await encrypt(message, key, iv, salt, stepCount, 0);

console.log('cipherText', result.cipherText);

// compute key from the start and decrypt, will take same amount of time as encrypt method
const originalMessage = await decrypt(result.cipherText, key, iv, salt, stepCount, 0);
console.log('originalMessage', originalMessage);

// if you have saved computedKeyHex, then it will be very fast to encrypt/decrypt
const resultFast = await encrypt(message, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);

const fastOriginalMessage = await decrypt(resultFast.cipherText, result.computedKeyHex, iv, salt, stepCount, stepCount - 1);
console.log('fastOriginalMessage', fastOriginalMessage);
```

## View Example

First run `yarn build`.

Run using command: `node --es-module-specifier-resolution=node examples/view.js`.

Make self executable and save to file:

```
import fs from 'fs';
import { randomHex, encrypt } from '../src';

const message = 'some secret message';
const key = randomHex();
const iv = randomHex();
const salt = randomHex();
const stepCount = 100; 
let script = fs.readFileSync('./public/js/view.js').toString();
const exportIndex = script.lastIndexOf('export');

script = script.substring(0, exportIndex);

encrypt(message, key, iv, salt, stepCount, 0)
  .then((result) => {
    script = `
  (() => {
    ${script}
    ;
    const rootEl = document.createElement('div');
    rootEl.id = 'view_someUUID';
    rootEl.style.cssText = 'position: fixed; color: #c1c1c1; background-color: #313131; top: 50px; z-index: 99999; padding: 12px; border-radius: 6px; left: 30px; box-shadow: 0px 0px 30px 0px rgba(0,0,0,0.68);';
  
    document.body.append(rootEl);
    window.slowCipherView('view_someUUID', 'someUUID', '${result.cipherText}', '${key}', '${salt}', '${iv}', ${stepCount});
  })()
  `;

    fs.writeFileSync('view_browser.js', script);
  })
  .catch((error) => console.log(error.message));
`

fs.writeFileSync('view_browser.js', script);
```
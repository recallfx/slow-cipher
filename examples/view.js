import fs from 'fs';
import slowCipher from '../src/index.js';

const message = 'some secret message';
const key = slowCipher.randomHex();
const iv = slowCipher.randomHex();
const salt = slowCipher.randomHex();
const stepCount = 10; // about 30s
let script = fs.readFileSync('./dist/view.js').toString();;
const exportIndex = script.lastIndexOf('export');

script = script.substring(0, exportIndex);

const result = await slowCipher.encrypt(message, key, iv, salt, stepCount, 0);

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
`

fs.writeFileSync('view_browser.js', script);
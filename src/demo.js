/* eslint-env browser */
import { intervalToDuration, formatDuration, getTime } from 'date-fns';
import { nanoid } from 'nanoid';
import { encrypt, decrypt, randomHex } from './slow-cipher';

const STEP_COUNT = 10000;
const KEY_BIT_LENGTH = 512;

const loadEl = document.getElementById('load');
const fillEl = document.getElementById('fill');
const clearEl = document.getElementById('clear');

clearEl.onclick = clear;
loadEl.onclick = load;
fillEl.onclick = fill;

const formInitEl = document.getElementById('formInit');
const keyEl = document.getElementById('key');
const saltEl = document.getElementById('salt');
const ivEl = document.getElementById('iv');
const stepCountEl = document.getElementById('stepCount');
const startIndexEl = document.getElementById('startIndex');
const formEncryptEl = document.getElementById('formEncrypt');
const inputEncryptEl = document.getElementById('inputEncrypt');

const formOutputEl = document.getElementById('formOutput');
const computedKeyEl = document.getElementById('computedKey');
const outputEl = document.getElementById('output');

const formDecryptEl = document.getElementById('formDecrypt');
const inputDecryptEl = document.getElementById('inputDecrypt');
const decryptResultEl = document.getElementById('decryptResult');

formEncryptEl.onsubmit = onSubmitEncrypt;
formDecryptEl.onsubmit = onSubmitDecrypt;

async function fetchScript(url) {
  const response = await fetch(url);
  let script = await response.text();

  // remove export as it is not supported the way we want to use
  const exportIndex = script.lastIndexOf('export');
  script = script.substring(0, exportIndex);

  return script;
}

function downloadScript(script, name) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(script)}`);
  element.setAttribute('download', name);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function fill() {
  keyEl.value = randomHex(KEY_BIT_LENGTH);
  saltEl.value = randomHex(KEY_BIT_LENGTH);
  ivEl.value = randomHex(KEY_BIT_LENGTH);
  stepCountEl.value = STEP_COUNT.toString();
  startIndexEl.value = 0;
  computedKeyEl.value = '';
}

function clear() {
  localStorage.removeItem('computeData');
  window.location.reload();
}

function load() {
  let computeDataString;

  try {
    computeDataString = localStorage.getItem('computeData');
    // eslint-disable-next-line no-empty
  } catch (_) {}

  if (computeDataString) {
    const { keyHex, saltHex, ivHex, stepCount, index, computedKeyHex } = JSON.parse(computeDataString);

    keyEl.value = keyHex;
    saltEl.value = saltHex;
    ivEl.value = ivHex;
    stepCountEl.value = stepCount.toString();
    startIndexEl.value = index.toString();
    computedKeyEl.value = computedKeyHex;
  } else {
    // eslint-disable-next-line no-alert
    alert('No saved data found in local storage');
  }
}

function printProgress(remainingTime, iterationsPerSecond, index, stepCount, computedKeyHex) {
  let durationString = '';
  try {
    const duration = intervalToDuration({
      start: getTime(Date.now()),
      end: getTime(Date.now()) + Math.round(remainingTime * 1000),
    });
    durationString = formatDuration(duration);
  } catch (error) {
    durationString = 'N/A';
  }

  outputEl.innerHTML = `<div>ETA: ${durationString}, ops/s: ${Math.round(
    iterationsPerSecond,
  )}, ${index}/${stepCount}</div>`;
  computedKeyEl.value = computedKeyHex;
}

function callback({
  keyHex,
  ivHex,
  saltHex,
  stepCount,
  startIndex,
  remainingTime,
  iterationsPerSecond,
  index,
  computedKeyHex,
  force,
}) {
  if (index % 1000 === 0 || force) {
    try {
      localStorage.setItem(
        'computeData',
        JSON.stringify({
          keyHex,
          saltHex,
          ivHex,
          stepCount,
          startIndex,
          index,
          computedKeyHex,
        }),
      );
    // eslint-disable-next-line no-empty
    } catch (_) {}
  }

  if (force) {
    startIndexEl.value = index;
    outputEl.innerHTML = '';
  } else {
    printProgress(remainingTime, iterationsPerSecond, index, stepCount, computedKeyHex);
  }
}

async function onSubmitEncrypt(event) {
  event.preventDefault();

  if (!formInitEl.checkValidity()) {
    formInitEl.reportValidity();
    return;
  }

  const startIndex = Number(startIndexEl.value);
  let key = keyEl.value;

  if (startIndex > 0) {
    if (!formOutputEl.checkValidity()) {
      formOutputEl.reportValidity();
      return;
    }  

    key = computedKeyEl.value;
  }

  const { computedKeyHex, cipherText } = await encrypt(
    inputEncryptEl.value,
    key,
    ivEl.value,
    saltEl.value,
    Number(stepCountEl.value),
    startIndex,
    callback,
  );

  computedKeyEl.value = computedKeyHex;
  inputDecryptEl.value = cipherText;

  outputEl.innerHTML = `Decryption <a href="./decrypt.html?uuid=${nanoid()}&cipherText=${encodeURIComponent(
    cipherText,
  )}&key=${keyEl.value}&salt=${saltEl.value}&iv=${ivEl.value}&stepCount=${stepCountEl.value}">url</a>`;
}

async function onSubmitDecrypt(event) {
  event.preventDefault();

  if (!formInitEl.checkValidity()) {
    formInitEl.reportValidity();
    return;
  }

  if (!formOutputEl.checkValidity()) {
    formOutputEl.reportValidity();
    return;
  }

  if (event.submitter.name === 'download') {
    onDownload();
    return;
  }

  const startIndex = Number(startIndexEl.value);
  const key = startIndex > 0 ? computedKeyEl.value : keyEl.value;

  const message = await decrypt(
    inputDecryptEl.value,
    key,
    ivEl.value,
    saltEl.value,
    Number(stepCountEl.value),
    startIndex,
    callback,
  );

  decryptResultEl.innerText = message;
}

async function onDownload() {
  const uuid = nanoid();
  const cipherText = inputDecryptEl.value;
  const keyHex = keyEl.value;
  const saltHex = saltEl.value;
  const ivHex = ivEl.value;
  const stepCount = Number(stepCountEl.value);

  let script = await fetchScript('js/view.js');

  const style =
    'position: fixed; color: #c1c1c1; background-color: #313131; top: 50px; z-index: 99999; padding: 12px; border-radius: 6px; left: 30px; box-shadow: 0px 0px 30px 0px rgba(0,0,0,0.68);';

  script = `
  (() => {
    ${script}
    ;
    const rootEl = document.createElement('div');
    rootEl.id = 'view_${uuid}';
    rootEl.style.cssText = '${style}';

    document.body.append(rootEl);
    window.slowCipherView('view_${uuid}', '${uuid}', '${cipherText}', '${keyHex}', '${saltHex}', '${ivHex}', ${stepCount});
  })()
  `;

  downloadScript(script, 'view.js');
}

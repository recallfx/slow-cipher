/* eslint-disable no-param-reassign */
/* eslint-env browser */
import intervalToDuration from 'date-fns/intervalToDuration';
import formatDuration from 'date-fns/formatDuration';
import getTime from 'date-fns/getTime';

import { decrypt } from './slow-cipher';

function renderProgress(outputEl, remainingTime, iterationsPerSecond, index, stepCount, computedKeyHex) {
  let durationString = 'N/A';
  try {
    const duration = intervalToDuration({
      start: getTime(Date.now()),
      end: getTime(Date.now()) + Math.round(remainingTime * 1000),
    });
    durationString = formatDuration(duration);
    // eslint-disable-next-line no-empty
  } catch (error) {}

  outputEl.innerHTML = `
  <div class="slow-cipher__container">
    <div class="slow-cipher__eta">ETA: ${durationString} ${Math.round(
    iterationsPerSecond,
  )}o/s ${index}/${stepCount}</div>
    <div class="slow-cipher__key">${computedKeyHex.substring(0, 50)}&hellip;</div>
  </div>
  `;
}

function callback({
  uuid,
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
  outputEl,
}) {
  if (index % 1000 === 0 || force) {
    try {
      localStorage.setItem(
        `computeData${uuid}`,
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

  if (index % 10 === 0) {
    renderProgress(outputEl, remainingTime, iterationsPerSecond, index, stepCount, computedKeyHex);
  }

  if (force) {
    outputEl.innerHTML = '';
  }
}

/**
 * Main function to run
 * @param {string} outputId - Element id where to render progress
 * @param {string} uuid
 * @param {string} cipherText
 * @param {string} keyHex
 * @param {string} saltHex
 * @param {string} ivHex
 * @param {number} stepCount
 */
async function view(outputId, uuid, cipherText, keyHex, saltHex, ivHex, stepCount) {
  let startIndex = 0;

  const rootEl = document.getElementById(outputId);

  if (!rootEl) {
    throw new Error(`Element with id '${outputId}' not found.`);
  }

  const outputEl = document.createElement('div');
  const resultEl = document.createElement('div');

  rootEl.appendChild(outputEl);
  rootEl.appendChild(resultEl);

  let computeDataString;

  try {
    computeDataString = localStorage.getItem(`computeData${uuid}`);
    // eslint-disable-next-line no-empty
  } catch (_) {}

  if (computeDataString) {
    const data = JSON.parse(computeDataString);

    if (data.keyHex === keyHex && data.index > 0) {
      keyHex = data.computedKeyHex;
      startIndex = data.index;
    }
  }

  const message = await decrypt(cipherText, keyHex, ivHex, saltHex, stepCount, startIndex, (data) =>
    callback({ ...data, uuid, outputEl }),
  );

  resultEl.innerHTML = `
  <div class="slow-cipher__container">
    <div class="slow-cipher__result">Password received: <code>${message}</code></div>
  </div>
  `;
}

if (typeof window !== 'undefined') {
  window.slowCipherView = view;
}

export default view;

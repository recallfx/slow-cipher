import { intervalToDuration, formatDuration, getTime } from 'date-fns';
import { decrypt } from './slow-cipher';

function renderProgress(outputEl, remainingTime, iterationsPerSecond, index, stepCount, computedKeyHex) {
  let durationString = '';
  try {
    const duration = intervalToDuration({
      start: getTime(Date.now()),
      end: getTime(Date.now()) + Math.round(remainingTime * 1000),
    });
    durationString = formatDuration(duration);
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
  let message;

  const rootEl = document.getElementById(outputId);

  if (!rootEl) {
    throw new Error(`Element with id '${outputId}' not found.`);
  }

  const outputEl = document.createElement('div');
  const resultEl = document.createElement('div');

  rootEl.append(outputEl);
  rootEl.append(resultEl);

  const computeDataString = localStorage.getItem(`computeData${uuid}`);

  if (computeDataString) {
    const data = JSON.parse(computeDataString);

    if (data.keyHex === keyHex && data.index > 0) {
      keyHex = data.computedKeyHex;
      startIndex = data.index;
    }
  }

  message = await decrypt(cipherText, keyHex, ivHex, saltHex, stepCount, startIndex, (data) =>
    callback({ ...data, uuid, outputEl }),
  );

  resultEl.innerHTML = `
  <div class="slow-cipher__container">
    <div class="slow-cipher__result">Password received: ${message}</div>
  </div>
  `;
}

if (typeof window !== 'undefined') {
  window.slowCipherView = view;
}

export default view;
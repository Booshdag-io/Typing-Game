/**
 * TypeSpeed game logic. Plain browser script, loaded at the end of <body>.
 */

// --- DOM Elements ---
const quoteDisplayElement = document.getElementById('quote-display');
const quoteTextElement = document.getElementById('quote-text');
const typingContainer = document.querySelector('.typing-container');
const typingInputElement = document.getElementById('typing-input');
const timerElement = document.getElementById('timer');
const wpmElement = document.getElementById('wpm');
const accuracyElement = document.getElementById('accuracy');
const mistakesElement = document.getElementById('mistakes');
const highScoreElement = document.getElementById('high-score');
const resetButton = document.getElementById('reset-button');
const containerElement = document.querySelector('.container');
const categorySelect = document.getElementById('category-select');
const quickMode = document.getElementById('quick-mode');
const quickDuration = document.getElementById('quick-duration');
const quickWordCount = document.getElementById('quick-word-count');
const ghostBadge = document.getElementById('ghost-badge');

// Modals
const resultModal = document.getElementById('result-modal');
const settingsModal = document.getElementById('settings-modal');
const modalWpmElement = document.getElementById('modal-wpm');
const modalAccuracyElement = document.getElementById('modal-accuracy');
const modalSourceElement = document.getElementById('modal-source');
const modalBestElement = document.getElementById('modal-best');
const modalRawElement = document.getElementById('modal-raw');
const modalCharsElement = document.getElementById('modal-chars');
const modalTimeElement = document.getElementById('modal-time');
const shareBtn = document.getElementById('share-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');

// Settings inputs
const modeSelector = document.getElementById('mode-selector');
const durationSelector = document.getElementById('duration-selector');
const wordCountSelector = document.getElementById('word-count-selector');
const timerSettingGroup = document.getElementById('timer-setting');
const wordCountSettingGroup = document.getElementById('word-count-setting');
const soundToggle = document.getElementById('sound-toggle-settings');
const hardModeToggle = document.getElementById('hard-mode-toggle-settings');
const ghostModeToggle = document.getElementById('ghost-mode-toggle');
const punctuationToggle = document.getElementById('punctuation-toggle');
const numbersToggle = document.getElementById('numbers-toggle');
const stopOnErrorToggle = document.getElementById('stop-on-error-toggle');
const capsWarning = document.getElementById('caps-warning');

// Chart
const chartContainer = document.getElementById('progress-chart-container');
const runChartContainer = document.getElementById('run-chart-container');
const runChart = document.getElementById('run-chart');
const runChartCaption = document.getElementById('run-chart-caption');
const chartCaption = document.getElementById('chart-caption');
const progressChart = document.getElementById('progress-chart');

// --- Storage ---
const STORAGE_KEYS = {
    history: 'typingGameHistory',
    bests: 'typingGameBests',
    settings: 'typingGameSettings',
};

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
        console.warn(`Ignoring unreadable localStorage value for ${key}`, err);
        return fallback;
    }
}

function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn(`Could not save ${key} to localStorage`, err);
    }
}

// --- Game State ---
const DURATIONS = [15, 30, 60];
const WORD_COUNTS = [10, 25, 50];
const DEFAULT_SETTINGS = {
    mode: 'time', // 'time' or 'words'
    duration: 60, // seconds, time mode
    wordCount: 10, // words mode
    category: 'common', // 'common' or a key of QUOTES (texts.js)
    isGhostEnabled: false,
    isHardMode: false,
    isSoundEnabled: true,
    hasPunctuation: false, // common words only
    hasNumbers: false, // common words only
    isStopOnError: false, // wrong keys do not advance the caret
};

const CATEGORIES = ['common', ...Object.keys(QUOTES)];

function sanitizeSettings(saved) {
    const settings = { ...DEFAULT_SETTINGS };
    if (!saved || typeof saved !== 'object') return settings;
    if (saved.mode === 'words') settings.mode = 'words';
    if (DURATIONS.includes(saved.duration)) settings.duration = saved.duration;
    if (WORD_COUNTS.includes(saved.wordCount)) settings.wordCount = saved.wordCount;
    if (CATEGORIES.includes(saved.category)) settings.category = saved.category;
    for (const flag of [
        'isGhostEnabled',
        'isHardMode',
        'isSoundEnabled',
        'hasPunctuation',
        'hasNumbers',
        'isStopOnError',
    ]) {
        if (typeof saved[flag] === 'boolean') settings[flag] = saved[flag];
    }
    return settings;
}

const gameState = sanitizeSettings(loadJSON(STORAGE_KEYS.settings, null));

// Per-run data. Reset by resetGame().
const runtime = {
    isStarted: false,
    startTime: 0,
    endTime: 0,
    interval: null,
    timer: 0, // seconds shown in the HUD
    quoteText: '', // text currently on screen
    quoteSource: '', // attribution of the passage on screen, if known
    quoteBase: 0, // characters in quotes already completed this run (time mode)
    baseCorrect: 0, // correct characters in completed quotes
    baseTyped: 0, // typed characters in completed quotes
    correctChars: 0, // correct characters across the whole run
    typedChars: 0, // typed characters across the whole run
    previousValue: '', // input value after the last input event
    keystrokes: 0, // characters inserted, including ones later deleted
    mistakes: 0, // inserted characters that did not match
    ghostStrokes: [], // {t: ms since start, i: character index} for Ghost Mode
    ghostTimeouts: [],
};

const HISTORY_LIMIT = 50;
const CHART_POINTS = 10;

let runHistory = loadJSON(STORAGE_KEYS.history, []);
if (!Array.isArray(runHistory)) runHistory = [];

// Best run per settings combination: { [settingsKey]: { wpm, keystrokes } }.
let bests = loadJSON(STORAGE_KEYS.bests, {});
if (!bests || typeof bests !== 'object' || Array.isArray(bests)) bests = {};

// Runs only compete with runs of the same mode, length, and category.
function settingsKey() {
    const length = gameState.mode === 'time' ? `${gameState.duration}s` : `${gameState.wordCount}w`;
    let category = gameState.category;
    if (category === 'common') {
        if (gameState.hasPunctuation) category += '+punctuation';
        if (gameState.hasNumbers) category += '+numbers';
    }
    return `${gameState.mode}:${length}:${category}`;
}

function currentBest() {
    const best = bests[settingsKey()];
    if (!best || typeof best.wpm !== 'number' || !Array.isArray(best.keystrokes)) return null;
    return best;
}

// --- Audio ---
// Created on first use so the browser does not warn about an AudioContext
// started before any user gesture.
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioContext = new Ctx();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
}

function playTone(ctx, { type, startFreq, endFreq, ramp, gain, duration, at }) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, at);
    if (endFreq !== undefined) {
        if (ramp === 'linear') osc.frequency.linearRampToValueAtTime(endFreq, at + duration);
        else osc.frequency.exponentialRampToValueAtTime(endFreq, at + duration);
    }
    gainNode.gain.setValueAtTime(gain, at);
    gainNode.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.start(at);
    osc.stop(at + duration);
}

function playSound(type) {
    if (!gameState.isSoundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'click') {
        playTone(ctx, {
            type: 'sine',
            startFreq: 800,
            endFreq: 400,
            gain: 0.05,
            duration: 0.05,
            at: now,
        });
    } else if (type === 'error') {
        playTone(ctx, {
            type: 'sawtooth',
            startFreq: 100,
            endFreq: 80,
            ramp: 'linear',
            gain: 0.08,
            duration: 0.15,
            at: now,
        });
    } else if (type === 'success') {
        // C5, E5, G5, C6
        [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => {
            playTone(ctx, {
                type: 'sine',
                startFreq: note,
                gain: 0.05,
                duration: 0.5,
                at: now + i * 0.1,
            });
        });
    }
}

// --- Text Selection ---
// Words per passage when Common Words runs in time mode. A new passage is
// loaded each time one is finished.
const COMMON_CHUNK = 25;
let lastQuoteIndex = -1;

function pickQuote(categoryQuotes) {
    let index;
    do {
        index = Math.floor(Math.random() * categoryQuotes.length);
    } while (categoryQuotes.length > 1 && index === lastQuoteIndex);
    lastQuoteIndex = index;
    return categoryQuotes[index];
}

// Random common words with no word twice in a row, plus optional
// punctuation (capitalized sentences, commas, full stops) and numbers.
function commonWords(count) {
    const words = [];
    let previous = '';
    let sentenceStart = true;
    for (let n = 0; n < count; n++) {
        let word;
        do {
            word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
        } while (word === previous);
        previous = word;

        if (gameState.hasNumbers && Math.random() < 0.1) {
            word = String(1 + Math.floor(Math.random() * 9999));
        }
        if (gameState.hasPunctuation) {
            if (sentenceStart) word = word[0].toUpperCase() + word.slice(1);
            sentenceStart = false;
            const roll = Math.random();
            if (n === count - 1 || roll < 0.1) {
                word += roll < 0.02 ? '?' : '.';
                sentenceStart = true;
            } else if (roll < 0.2) {
                word += ',';
            }
        }
        words.push(word);
    }
    return words.join(' ');
}

// Returns { text, source } for the next passage.
function getPassage() {
    if (gameState.category === 'common') {
        const count = gameState.mode === 'words' ? gameState.wordCount : COMMON_CHUNK;
        return { text: commonWords(count), source: '' };
    }
    const categoryQuotes = QUOTES[gameState.category];
    if (gameState.mode === 'words') {
        const words = [];
        while (words.length < gameState.wordCount) {
            words.push(...pickQuote(categoryQuotes).text.split(' '));
        }
        return { text: words.slice(0, gameState.wordCount).join(' '), source: '' };
    }
    return pickQuote(categoryQuotes);
}

function renderNewQuote() {
    const passage = getPassage();
    runtime.quoteText = passage.text;
    runtime.quoteSource = passage.source;
    quoteDisplayElement.textContent = '';
    quoteTextElement.textContent = runtime.quoteText;

    if (gameState.isGhostEnabled) {
        const ghostCursor = document.createElement('div');
        ghostCursor.id = 'ghost-cursor';
        ghostCursor.className = 'ghost-cursor';
        quoteDisplayElement.appendChild(ghostCursor);
    }

    const fragment = document.createDocumentFragment();
    runtime.quoteText.split('').forEach((character) => {
        const span = document.createElement('span');
        span.textContent = character;
        fragment.appendChild(span);
    });
    quoteDisplayElement.appendChild(fragment);

    const firstSpan = quoteDisplayElement.querySelector('span');
    if (firstSpan) firstSpan.classList.add('current');

    typingInputElement.value = '';
    typingInputElement.maxLength = runtime.quoteText.length;
    runtime.previousValue = '';
}

// --- Core Logic ---
function handleInput() {
    if (settingsModal.classList.contains('show')) return;
    if (!runtime.isStarted) startGame();

    // The interval checks the clock only every 250 ms. Input that arrives
    // after the deadline ends the run instead of counting toward it.
    if (gameState.mode === 'time' && elapsedMs() >= gameState.duration * 1000) {
        endGame(runtime.startTime + gameState.duration * 1000);
        return;
    }

    let typed = typingInputElement.value;
    const quote = runtime.quoteText;
    const spans = quoteDisplayElement.querySelectorAll('span');

    // Count keystrokes and mistakes for the characters past the part of the
    // value that did not change. Diffing against the previous value, instead
    // of trusting e.data, also handles on-screen keyboards that resend the
    // whole word being composed or replace it after autocorrect.
    const previous = runtime.previousValue;
    let unchanged = 0;
    while (
        unchanged < previous.length &&
        unchanged < typed.length &&
        previous[unchanged] === typed[unchanged]
    ) {
        unchanged++;
    }
    const inserted = typed.slice(unchanged);
    if (inserted.length > 0) {
        let wrong = 0;
        let firstWrong = -1;
        for (let k = 0; k < inserted.length; k++) {
            const pos = unchanged + k;
            if (pos >= quote.length) continue;
            runtime.keystrokes++;
            if (inserted[k] !== quote[pos]) {
                wrong++;
                if (firstWrong === -1) firstWrong = pos;
            }
        }
        if (wrong > 0) {
            runtime.mistakes += wrong;
            mistakesElement.textContent = runtime.mistakes;
            playSound('error');
        } else {
            playSound('click');
        }
        // Stop on error: the mistake is counted, but the caret stays put
        // until the right key is pressed.
        if (gameState.isStopOnError && firstWrong !== -1) {
            typed = typed.slice(0, firstWrong);
            typingInputElement.value = typed;
        }
    }
    runtime.previousValue = typed;

    runtime.ghostStrokes.push({
        t: Date.now() - runtime.startTime,
        i: runtime.quoteBase + typed.length,
    });

    let correctCount = 0;
    spans.forEach((span, index) => {
        span.classList.remove('correct', 'incorrect', 'current');
        if (index >= typed.length) return;
        if (typed[index] === quote[index]) {
            span.classList.add('correct');
            correctCount++;
        } else {
            span.classList.add('incorrect');
        }
    });
    if (typed.length < spans.length) spans[typed.length].classList.add('current');

    runtime.correctChars = runtime.baseCorrect + correctCount;
    runtime.typedChars = runtime.baseTyped + typed.length;
    updateMetrics();

    if (typed.length === quote.length) {
        if (gameState.mode === 'time') {
            // Keep going until the clock runs out.
            runtime.baseCorrect += correctCount;
            runtime.baseTyped += typed.length;
            runtime.quoteBase += quote.length;
            renderNewQuote();
        } else {
            endGame();
        }
    }
}

function elapsedMs() {
    const end = runtime.endTime || Date.now();
    return end - runtime.startTime;
}

function startGame() {
    runtime.isStarted = true;
    runtime.startTime = Date.now();
    runtime.endTime = 0;
    containerElement.classList.add('focus-mode');

    runtime.timer = gameState.mode === 'time' ? gameState.duration : 0;
    timerElement.textContent = runtime.timer;
    runtime.interval = setInterval(tick, 250);

    const best = currentBest();
    if (gameState.isGhostEnabled && best) startGhostPlayback(best);
}

function tick() {
    const elapsedSeconds = Math.floor(elapsedMs() / 1000);
    if (gameState.mode === 'time') {
        runtime.timer = Math.max(0, gameState.duration - elapsedSeconds);
        timerElement.textContent = runtime.timer;
        if (elapsedMs() >= gameState.duration * 1000) {
            endGame(runtime.startTime + gameState.duration * 1000);
            return;
        }
    } else {
        runtime.timer = elapsedSeconds;
        timerElement.textContent = runtime.timer;
    }
    updateMetrics();
}

function startGhostPlayback(best) {
    if (!document.getElementById('ghost-cursor')) return;
    runtime.ghostTimeouts = best.keystrokes.map((stroke) =>
        setTimeout(() => {
            if (!runtime.isStarted) return;
            // Look everything up live: the quote (and its spans) may have
            // been replaced since playback started.
            const cursor = document.getElementById('ghost-cursor');
            const spans = quoteDisplayElement.querySelectorAll('span');
            const targetSpan = spans[stroke.i - runtime.quoteBase];
            if (!cursor || !targetSpan) return;
            // offsetLeft/Top are layout coordinates inside .quote-display,
            // so the focus-mode scale does not shift them.
            cursor.style.transform = `translate(${targetSpan.offsetLeft}px, ${targetSpan.offsetTop}px)`;
            cursor.style.opacity = 1;
        }, stroke.t)
    );
}

function stopGhostPlayback() {
    runtime.ghostTimeouts.forEach(clearTimeout);
    runtime.ghostTimeouts = [];
}

function updateMetrics() {
    const elapsed = elapsedMs();
    const wpm = elapsed >= 1000 ? Math.round(runtime.correctChars / 5 / (elapsed / 60000)) : 0;
    const accuracy =
        runtime.keystrokes > 0
            ? Math.floor(((runtime.keystrokes - runtime.mistakes) / runtime.keystrokes) * 100)
            : 100;
    wpmElement.textContent = wpm;
    accuracyElement.textContent = accuracy;
    return { wpm, accuracy };
}

function endGame(endTime = Date.now()) {
    if (!runtime.isStarted) return;
    runtime.isStarted = false;
    runtime.endTime = endTime;
    clearInterval(runtime.interval);
    stopGhostPlayback();
    typingInputElement.disabled = true;
    containerElement.classList.remove('focus-mode');

    const { wpm, accuracy } = updateMetrics();
    const previousBest = currentBest();
    let isNewBest = false;

    // Runs under a second have no meaningful WPM. Show them, but do not record them.
    if (elapsedMs() >= 1000) {
        const key = settingsKey();
        runHistory.unshift({
            wpm,
            accuracy,
            date: new Date().toISOString(),
            mode: gameState.mode,
            key,
        });
        runHistory.length = Math.min(runHistory.length, HISTORY_LIMIT);
        saveJSON(STORAGE_KEYS.history, runHistory);

        if (wpm > (previousBest ? previousBest.wpm : 0)) {
            bests[key] = { wpm, keystrokes: runtime.ghostStrokes };
            saveJSON(STORAGE_KEYS.bests, bests);
            isNewBest = true;
        }
    }

    playSound('success');
    updateHighScoreDisplay();
    renderChart();
    renderRunChart();
    showResultModal(wpm, accuracy, { isNewBest, previousBest });
}

function renderChart() {
    const key = settingsKey();
    const data = runHistory
        .filter((h) => h.key === key)
        .slice(0, CHART_POINTS)
        .map((h) => h.wpm)
        .reverse(); // oldest to newest
    chartContainer.classList.toggle('hidden', data.length < 2);
    if (data.length < 2) return;

    const { min, max } = drawLineChart(progressChart, data, true);

    const label = data.length === 1 ? 'run' : 'runs';
    chartCaption.textContent =
        min === max
            ? `Last ${data.length} ${label} at these settings, ${min} WPM`
            : `Last ${data.length} ${label} at these settings, ${min} to ${max} WPM`;
}

// Draws numbers as a polyline in a 300x100 viewBox. Only numbers reach
// innerHTML. Returns the range so callers can caption the chart.
function drawLineChart(svg, data, withDots) {
    const width = 300;
    const height = 100;
    const pad = 6;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const x = (i) => pad + (i / (data.length - 1)) * (width - 2 * pad);
    const y = (v) => pad + (1 - (v - min) / range) * (height - 2 * pad);

    const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const circles = withDots
        ? data.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" />`).join('')
        : '';
    svg.innerHTML = `<polyline points="${points}" />${circles}`;
    return { min, max };
}

// WPM at the end of each whole second, from the recorded input events.
// Counts every typed character, right or wrong.
function wpmBySecond() {
    const seconds = Math.floor(elapsedMs() / 1000);
    const strokes = runtime.ghostStrokes;
    const points = [];
    let k = 0;
    let index = 0;
    for (let s = 1; s <= seconds; s++) {
        while (k < strokes.length && strokes[k].t <= s * 1000) {
            index = strokes[k].i;
            k++;
        }
        points.push(Math.round(index / 5 / (s / 60)));
    }
    return points;
}

function renderRunChart() {
    const data = wpmBySecond();
    runChartContainer.classList.toggle('hidden', data.length < 2);
    if (data.length < 2) return;
    const { max } = drawLineChart(runChart, data, false);
    runChartCaption.textContent = `WPM by second, all typed characters. Peak ${max} WPM.`;
}

function resetGame() {
    clearInterval(runtime.interval);
    stopGhostPlayback();
    Object.assign(runtime, {
        isStarted: false,
        startTime: 0,
        endTime: 0,
        interval: null,
        quoteBase: 0,
        baseCorrect: 0,
        baseTyped: 0,
        correctChars: 0,
        typedChars: 0,
        keystrokes: 0,
        mistakes: 0,
        ghostStrokes: [],
    });

    runtime.timer = gameState.mode === 'time' ? gameState.duration : 0;
    timerElement.textContent = runtime.timer;
    wpmElement.textContent = 0;
    accuracyElement.textContent = 100;
    mistakesElement.textContent = 0;

    containerElement.classList.remove('focus-mode');
    typingInputElement.disabled = false;
    resultModal.classList.remove('show');
    settingsModal.classList.remove('show');

    updateQuickBar();
    updateHighScoreDisplay();
    renderNewQuote();
    typingInputElement.focus();
}

// The mode and length pills on the main screen mirror gameState.
function updateQuickBar() {
    setActivePill(quickMode, gameState.mode);
    setActivePill(quickDuration, String(gameState.duration));
    setActivePill(quickWordCount, String(gameState.wordCount));
    quickDuration.classList.toggle('hidden', gameState.mode !== 'time');
    quickWordCount.classList.toggle('hidden', gameState.mode !== 'words');
    ghostBadge.classList.toggle('hidden', !gameState.isGhostEnabled);
}

function updateHighScoreDisplay() {
    const best = currentBest();
    highScoreElement.textContent = best ? best.wpm : 0;
}

// Focus an element inside a dialog that was shown in this same tick. If the
// browser refuses because the dialog has not rendered yet, retry next frame.
function focusInDialog(element) {
    element.focus();
    if (document.activeElement !== element) {
        requestAnimationFrame(() => element.focus());
    }
}

function showResultModal(wpm, accuracy, { isNewBest, previousBest }) {
    const elapsed = elapsedMs();
    const raw = elapsed >= 1000 ? Math.round(runtime.typedChars / 5 / (elapsed / 60000)) : 0;
    const wrong = runtime.typedChars - runtime.correctChars;
    modalWpmElement.textContent = wpm;
    modalAccuracyElement.textContent = `${accuracy}%`;
    modalRawElement.textContent = raw;
    modalCharsElement.textContent = `${runtime.correctChars} correct, ${wrong} wrong`;
    modalTimeElement.textContent = `${(elapsed / 1000).toFixed(1)}s`;
    if (isNewBest) {
        modalBestElement.textContent = previousBest
            ? `New best for these settings. Previous best: ${previousBest.wpm} WPM.`
            : 'First recorded run for these settings.';
    } else if (elapsed < 1000) {
        modalBestElement.textContent = 'Runs under one second are not recorded.';
    } else if (!previousBest) {
        modalBestElement.textContent = 'No recorded best for these settings yet.';
    } else {
        modalBestElement.textContent = `Best for these settings: ${previousBest.wpm} WPM.`;
    }
    modalBestElement.classList.toggle('new-best', isNewBest && Boolean(previousBest));
    modalSourceElement.textContent = runtime.quoteSource;
    modalSourceElement.classList.toggle('hidden', !runtime.quoteSource);
    resultModal.classList.add('show');
    updateFocusHint();
    focusInDialog(playAgainBtn);
}

// --- Sharing ---
const SITE_URL = 'https://tmhsdigital.github.io/Typing-Game/';

function settingsLabel() {
    const length =
        gameState.mode === 'time' ? `${gameState.duration}s` : `${gameState.wordCount} words`;
    const category = categorySelect.selectedOptions[0]?.textContent || gameState.category;
    return `${length} ${category}`;
}

function shareText() {
    return `${modalWpmElement.textContent} WPM, ${modalAccuracyElement.textContent} accuracy, ${settingsLabel()} on TypeSpeed`;
}

// Phones get the system share sheet. Desktops, where navigator.share opens
// an OS dialog people do not expect, copy to the clipboard.
async function shareResult() {
    const text = shareText();
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
        try {
            await navigator.share({ title: 'TypeSpeed', text, url: SITE_URL });
        } catch {
            // Dismissing the share sheet rejects; nothing to report.
        }
        return;
    }
    try {
        await navigator.clipboard.writeText(`${text} ${SITE_URL}`);
        shareBtn.textContent = 'Copied!';
    } catch {
        shareBtn.textContent = 'Copy failed';
    }
    setTimeout(() => {
        shareBtn.textContent = 'Share Result';
    }, 2000);
}

// --- Settings ---
function saveSettings() {
    saveJSON(STORAGE_KEYS.settings, gameState);
}

function setActivePill(selector, value) {
    selector.querySelectorAll('.pill').forEach((pill) => {
        const active = pill.dataset.value === value;
        pill.classList.toggle('active', active);
        pill.setAttribute('aria-pressed', String(active));
    });
}

// Push gameState into the settings controls and the quote display.
function applySettingsToUI() {
    setActivePill(modeSelector, gameState.mode);
    setActivePill(durationSelector, String(gameState.duration));
    setActivePill(wordCountSelector, String(gameState.wordCount));
    timerSettingGroup.classList.toggle('hidden', gameState.mode !== 'time');
    wordCountSettingGroup.classList.toggle('hidden', gameState.mode !== 'words');
    categorySelect.value = gameState.category;
    soundToggle.checked = gameState.isSoundEnabled;
    hardModeToggle.checked = gameState.isHardMode;
    ghostModeToggle.checked = gameState.isGhostEnabled;
    punctuationToggle.checked = gameState.hasPunctuation;
    numbersToggle.checked = gameState.hasNumbers;
    stopOnErrorToggle.checked = gameState.isStopOnError;
    quoteDisplayElement.classList.toggle('blurred', gameState.isHardMode);
}

// Settings changes reset the game on close anyway, so a run in progress is
// abandoned here instead of letting its clock run out behind the dialog.
function openSettings() {
    if (runtime.isStarted) resetGame();
    typingInputElement.blur();
    settingsModal.classList.add('show');
    updateFocusHint();
    focusInDialog(modeSelector.querySelector('.pill.active') || closeSettingsBtn);
}

// Pill clicks update gameState immediately; the new settings take effect
// when the modal closes and the game resets.
function closeSettings() {
    settingsModal.classList.remove('show');
    saveSettings();
    resetGame();
}

function applyPill(group, value) {
    if (group === 'mode') {
        gameState.mode = value === 'words' ? 'words' : 'time';
    } else if (group === 'duration') {
        gameState.duration = parseInt(value, 10);
    } else if (group === 'wordCount') {
        gameState.wordCount = parseInt(value, 10);
    }
}

function handlePillClick(e, group) {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    setActivePill(e.currentTarget, pill.dataset.value);
    applyPill(group, pill.dataset.value);
    timerSettingGroup.classList.toggle('hidden', gameState.mode !== 'time');
    wordCountSettingGroup.classList.toggle('hidden', gameState.mode !== 'words');
}

// Main-screen pills change the setting and start a fresh run at once, like
// the category select.
function handleQuickPillClick(e, group) {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    applyPill(group, pill.dataset.value);
    saveSettings();
    applySettingsToUI();
    resetGame();
}

// --- Keyboard ---
// Keys that would move the caret or select text inside the input. Typing
// always happens at the end of the value.
const CARET_KEYS = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
];

function handleInputKeydown(e) {
    updateCapsWarning(e);
    const selectAll = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a';
    if (CARET_KEYS.includes(e.key) || selectAll) e.preventDefault();
}

// With Caps Lock on, every letter is wrong. Warn before the run is wasted.
function updateCapsWarning(e) {
    if (typeof e.getModifierState !== 'function') return;
    capsWarning.classList.toggle('hidden', !e.getModifierState('CapsLock'));
}

function pinCaretToEnd() {
    const end = typingInputElement.value.length;
    typingInputElement.setSelectionRange(end, end);
}

// A click would place the caret where it lands. Focus without moving it.
function handleInputMousedown(e) {
    e.preventDefault();
    typingInputElement.focus();
    pinCaretToEnd();
}

function isModalOpen(modal) {
    return modal.classList.contains('show');
}

// Keep Tab and Shift+Tab inside the open dialog.
function trapFocus(e, modal) {
    const focusable = Array.from(
        modal.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

// Show the "press any key" hint while nothing would receive typing. Runs
// after focus has settled, so opening a dialog does not flash it.
function updateFocusHint() {
    const lost =
        document.activeElement !== typingInputElement &&
        !isModalOpen(settingsModal) &&
        !isModalOpen(resultModal);
    typingContainer.classList.toggle('unfocused', lost);
}

// A printable key pressed while focus is elsewhere goes to the input. Form
// controls keep their own keys, and Space still presses a focused button.
function refocusOnType(e) {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    const active = document.activeElement;
    if (active === typingInputElement || typingInputElement.disabled) return;
    if (active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
    if (e.key === ' ' && active && active.tagName === 'BUTTON') return;
    typingInputElement.focus();
}

function handleKeydown(e) {
    if (e.key === 'Escape') {
        if (isModalOpen(settingsModal)) closeSettings();
        else if (isModalOpen(resultModal)) resetGame();
        return;
    }
    if (e.key === 'Tab' && isModalOpen(settingsModal)) {
        trapFocus(e, settingsModal);
        return;
    }
    if (e.key === 'Tab' && isModalOpen(resultModal)) {
        trapFocus(e, resultModal);
        return;
    }

    if (e.key !== 'Tab') {
        if (!isModalOpen(settingsModal) && !isModalOpen(resultModal)) refocusOnType(e);
        return;
    }

    // Tab restarts only while typing. Elsewhere, and for Shift+Tab, it
    // moves focus as usual so the page stays keyboard-navigable.
    if (e.shiftKey || document.activeElement !== typingInputElement) return;
    e.preventDefault();
    resetGame();
}

// --- Init ---
function init() {
    applySettingsToUI();
    updateHighScoreDisplay();

    typingInputElement.addEventListener('input', handleInput);
    typingInputElement.addEventListener('keydown', handleInputKeydown);
    typingInputElement.addEventListener('keyup', updateCapsWarning);
    typingInputElement.addEventListener('mousedown', handleInputMousedown);
    typingInputElement.addEventListener('select', pinCaretToEnd);
    typingInputElement.addEventListener('focus', pinCaretToEnd);
    typingInputElement.addEventListener('focus', updateFocusHint);
    typingInputElement.addEventListener('blur', () => setTimeout(updateFocusHint, 0));
    typingInputElement.addEventListener('paste', (e) => e.preventDefault());
    typingInputElement.addEventListener('drop', (e) => e.preventDefault());
    resetButton.addEventListener('click', resetGame);

    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    modeSelector.addEventListener('click', (e) => handlePillClick(e, 'mode'));
    durationSelector.addEventListener('click', (e) => handlePillClick(e, 'duration'));
    wordCountSelector.addEventListener('click', (e) => handlePillClick(e, 'wordCount'));
    quickMode.addEventListener('click', (e) => handleQuickPillClick(e, 'mode'));
    quickDuration.addEventListener('click', (e) => handleQuickPillClick(e, 'duration'));
    quickWordCount.addEventListener('click', (e) => handleQuickPillClick(e, 'wordCount'));

    categorySelect.addEventListener('change', (e) => {
        gameState.category = e.target.value;
        saveSettings();
        resetGame();
    });

    soundToggle.addEventListener('change', (e) => {
        gameState.isSoundEnabled = e.target.checked;
    });
    hardModeToggle.addEventListener('change', (e) => {
        gameState.isHardMode = e.target.checked;
        quoteDisplayElement.classList.toggle('blurred', gameState.isHardMode);
    });
    ghostModeToggle.addEventListener('change', (e) => {
        gameState.isGhostEnabled = e.target.checked;
    });
    punctuationToggle.addEventListener('change', (e) => {
        gameState.hasPunctuation = e.target.checked;
    });
    numbersToggle.addEventListener('change', (e) => {
        gameState.hasNumbers = e.target.checked;
    });
    stopOnErrorToggle.addEventListener('change', (e) => {
        gameState.isStopOnError = e.target.checked;
    });

    shareBtn.addEventListener('click', shareResult);
    playAgainBtn.addEventListener('click', resetGame);

    document.addEventListener('keydown', handleKeydown);

    resetGame();
}

init();

// End-to-end tests against the real page. page.evaluate callbacks run in the
// browser, where script.js's top-level consts are in scope.
/* global runtime, gameState, resultModal, typingInputElement, wpmElement, updateMetrics,
   getPassage, settingsKey, COMMON_WORDS, QUOTES */

const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');

const input = (page) => page.locator('#typing-input');
const currentQuote = (page) => page.evaluate(() => runtime.quoteText);

function collectErrors(page) {
    const errors = [];
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
}

test.describe('loading', () => {
    test('loads without console output and focuses the input', async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto('/');

        await expect(page).toHaveTitle('TypeSpeed');
        await expect(input(page)).toBeFocused();
        await expect(page.locator('#timer')).toHaveText('60');
        await expect(page.locator('#quick-duration .pill.active')).toHaveText('60s');
        await expect(page.locator('#quick-word-count')).toBeHidden();

        const quote = await currentQuote(page);
        expect(quote.length).toBeGreaterThan(0);
        await expect(input(page)).toHaveAttribute('maxlength', String(quote.length));
        await expect(page.locator('#quote-display span')).toHaveCount(quote.length);
        expect(errors).toEqual([]);
    });

    test('makes no requests to other origins and uses the bundled fonts', async ({ page }) => {
        const external = [];
        page.on('request', (request) => {
            if (!request.url().startsWith('http://127.0.0.1:8765/')) external.push(request.url());
        });
        const errors = collectErrors(page);
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);

        const loaded = await page.evaluate(() =>
            [...document.fonts]
                .filter((face) => face.status === 'loaded')
                .map((face) => face.family.replace(/"/g, ''))
                .sort()
        );
        expect(loaded).toEqual(['JetBrains Mono', 'Space Grotesk']);
        expect(external.filter((url) => !url.startsWith('data:'))).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('ignores corrupt localStorage instead of crashing', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', '{not json');
            localStorage.setItem('typingGameHistory', '"nope"');
            localStorage.setItem('typingGameBests', '[1, 2]');
        });
        const errors = collectErrors(page);
        await page.goto('/');

        await expect(page.locator('#quote-display span').first()).toBeAttached();
        expect(await page.evaluate(() => gameState.mode)).toBe('time');
        await expect(page.locator('#high-score')).toHaveText('0');
        // The warnings about unreadable values are expected; nothing else is.
        expect(errors.filter((e) => !e.includes('Ignoring unreadable'))).toEqual([]);
    });

    test('scrolls on a short viewport instead of clipping', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 500 });
        await page.goto('/');

        const layout = await page.evaluate(() => ({
            overflowY: getComputedStyle(document.body).overflowY,
            taller: document.documentElement.scrollHeight > window.innerHeight,
        }));
        expect(layout.overflowY).toBe('auto');
        expect(layout.taller).toBe(true);

        await page.evaluate(() => window.scrollTo(0, 10000));
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
});

test.describe('time mode', () => {
    test('loads the next quote on completion and ends when the clock runs out', async ({
        page,
    }) => {
        await page.clock.install();
        await page.goto('/');
        const quote = await currentQuote(page);

        await input(page).pressSequentially(quote);

        const after = await page.evaluate(() => ({
            started: runtime.isStarted,
            quoteBase: runtime.quoteBase,
            quote: runtime.quoteText,
            resultShown: resultModal.classList.contains('show'),
            inputValue: typingInputElement.value,
        }));
        expect(after.started).toBe(true);
        expect(after.quoteBase).toBe(quote.length);
        expect(after.quote).not.toBe(quote);
        expect(after.resultShown).toBe(false);
        expect(after.inputValue).toBe('');

        await page.clock.runFor(61_000);

        await expect(page.locator('#result-modal')).toHaveClass(/show/);
        await expect(page.locator('#timer')).toHaveText('0');
        await expect(page.locator('#play-again-btn')).toBeFocused();
        await expect(input(page)).toBeDisabled();
    });

    test('WPM uses real elapsed time and correct characters only', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await page.goto('/');
        await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
        const quote = await currentQuote(page);

        await input(page).pressSequentially(quote.slice(0, 20));
        // Under one second of elapsed time the display stays at 0.
        await expect(page.locator('#wpm')).toHaveText('0');

        await page.clock.runFor(30_000);

        const metrics = await page.evaluate(() => ({
            wpm: Number(wpmElement.textContent),
            correct: runtime.correctChars,
            elapsed: Date.now() - runtime.startTime,
        }));
        expect(metrics.correct).toBe(20);
        expect(metrics.elapsed).toBe(30_000);
        expect(metrics.wpm).toBe(Math.round(20 / 5 / (30_000 / 60_000)));
    });
});

test('accuracy counts mistakes even after they are fixed', async ({ page }) => {
    await page.goto('/');
    const quote = await currentQuote(page);
    const wrongKey = quote[0] === 'x' ? 'y' : 'x';

    await input(page).press(wrongKey);
    await expect(page.locator('#mistakes')).toHaveText('1');
    await expect(page.locator('#accuracy')).toHaveText('0');
    await expect(page.locator('#quote-display span').first()).toHaveClass('incorrect');

    await input(page).press('Backspace');
    await input(page).pressSequentially(quote.slice(0, 9));

    await expect(page.locator('#mistakes')).toHaveText('1');
    await expect(page.locator('#accuracy')).toHaveText('90');
    await expect(page.locator('#quote-display span').first()).toHaveClass('correct');
    await expect(page.locator('#quote-display span').nth(9)).toHaveClass('current');
});

test.describe('settings dialog', () => {
    test('takes focus on open, traps Tab, ignores typing, closes on Escape', async ({ page }) => {
        await page.goto('/');
        await page.locator('#settings-btn').click();

        const dialog = page.locator('#settings-modal');
        await expect(dialog).toHaveClass(/show/);
        await expect(dialog).toHaveAttribute('role', 'dialog');
        await expect(page.locator('#mode-selector .pill.active')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#mode-selector .pill[data-value="words"]')).toBeFocused();

        await page.keyboard.press('a');
        expect(await page.evaluate(() => [runtime.isStarted, typingInputElement.value])).toEqual([
            false,
            '',
        ]);

        // Shift+Tab from the first control wraps to the last one.
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#close-settings-btn')).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(dialog).not.toHaveClass(/show/);
        await expect(input(page)).toBeFocused();
    });

    test('opening it during a run abandons the run', async ({ page }) => {
        await page.clock.install();
        await page.goto('/');
        const quote = await currentQuote(page);
        await input(page).pressSequentially(quote.slice(0, 5));

        // Focus mode blocks clicks on the header, but the keyboard still reaches it.
        for (let n = 0; n < 12; n++) {
            await page.keyboard.press('Shift+Tab');
            if (await page.evaluate(() => document.activeElement.id === 'settings-btn')) break;
        }
        await expect(page.locator('#settings-btn')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#settings-modal')).toHaveClass(/show/);
        await page.clock.runFor(61_000);

        await expect(page.locator('#result-modal')).not.toHaveClass(/show/);
        expect(await page.evaluate(() => runtime.isStarted)).toBe(false);
        await expect(page.locator('#timer')).toHaveText('60');
        await expect(page.locator('#wpm')).toHaveText('0');
        expect(await page.evaluate(() => localStorage.getItem('typingGameHistory'))).toBeNull();
    });

    test('words mode is chosen by keyboard, saved, and ends after the word count', async ({
        page,
    }) => {
        await page.goto('/');
        await page.locator('#settings-btn').click();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        await expect(page.locator('#word-count-setting')).toBeVisible();
        await expect(page.locator('#timer-setting')).toBeHidden();

        await page.keyboard.press('Escape');
        await expect(page.locator('#quick-mode .pill.active')).toHaveText('Words');
        await expect(page.locator('#quick-word-count .pill.active')).toHaveText('10');
        await expect(page.locator('#timer')).toHaveText('0');

        const saved = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('typingGameSettings'))
        );
        expect(saved.mode).toBe('words');

        const quote = await currentQuote(page);
        expect(quote.split(' ')).toHaveLength(10);

        // A delay keeps the run over one second, so it is recorded.
        await input(page).pressSequentially(quote, { delay: 40 });

        await expect(page.locator('#result-modal')).toHaveClass(/show/);
        await expect(page.locator('#play-again-btn')).toBeFocused();
        await expect(input(page)).toBeDisabled();
        await expect(page.locator('#progress-chart-container')).toBeHidden();

        const history = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('typingGameHistory'))
        );
        expect(history).toHaveLength(1);
        expect(history[0].mode).toBe('words');
        expect(history[0].key).toBe('words:10w:common');

        // A second run makes the chart appear.
        await page.keyboard.press('Enter');
        await expect(input(page)).toBeFocused();
        await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
        await expect(page.locator('#progress-chart-container')).toBeVisible();
        await expect(page.locator('#chart-caption')).toHaveText(/^Last 2 runs/);
        await expect(page.locator('#progress-chart circle')).toHaveCount(2);

        // Settings survive a reload.
        await page.reload();
        await expect(page.locator('#quick-mode .pill.active')).toHaveText('Words');
    });
});

test.describe('best scores', () => {
    test('are kept per mode, length, and category', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem(
                'typingGameBests',
                JSON.stringify({
                    'time:60s:common': { wpm: 40, keystrokes: [] },
                    'words:10w:common': { wpm: 70, keystrokes: [] },
                })
            );
        });
        await page.goto('/');
        await expect(page.locator('#high-score')).toHaveText('40');

        await page.locator('#settings-btn').click();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');
        await expect(page.locator('#high-score')).toHaveText('70');

        await page.locator('#category-select').selectOption('code');
        await expect(page.locator('#high-score')).toHaveText('0');
    });

    test('runs under one second are shown but not recorded', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        });
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await page.goto('/');
        // Freeze time so the whole run takes zero elapsed milliseconds,
        // however slowly the machine types.
        await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));

        await input(page).pressSequentially(await currentQuote(page));
        await expect(page.locator('#result-modal')).toHaveClass(/show/);

        const stored = await page.evaluate(() => [
            localStorage.getItem('typingGameHistory'),
            localStorage.getItem('typingGameBests'),
        ]);
        expect(stored).toEqual([null, null]);
        await expect(page.locator('#high-score')).toHaveText('0');
    });
});

test('reduced motion turns off animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const styles = await page.evaluate(() => ({
        glow: getComputedStyle(document.querySelector('.background-glow')).animationName,
        caret: getComputedStyle(document.querySelector('.current'), '::before').animationName,
    }));
    expect(styles).toEqual({ glow: 'none', caret: 'none' });
});

test('paste and drop are blocked', async ({ page }) => {
    await page.goto('/');
    const blocked = await page.evaluate(() => {
        const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        return [!typingInputElement.dispatchEvent(paste), !typingInputElement.dispatchEvent(drop)];
    });
    expect(blocked).toEqual([true, true]);
});

test('share copies a summary to the clipboard', async ({ page }) => {
    // Firefox and WebKit cannot grant clipboard permissions to tests, so
    // record what the page writes instead of reading the system clipboard.
    await page.addInitScript(() => {
        navigator.clipboard.writeText = async (text) => {
            window.copiedText = text;
        };
    });
    await page.goto('/');
    await page.evaluate(() => {
        gameState.mode = 'words';
    });
    await page.locator('#reset-button').click();
    await input(page).pressSequentially(await currentQuote(page));
    await expect(page.locator('#result-modal')).toHaveClass(/show/);

    await page.locator('#share-btn').click();
    await expect(page.locator('#share-btn')).toHaveText('Copied!');
    const clipboard = await page.evaluate(() => window.copiedText);
    expect(clipboard).toMatch(
        /^\d+ WPM, \d+% accuracy, 10 words Common Words on TypeSpeed https:\/\/tmhsdigital\.github\.io\/Typing-Game\/$/
    );
    await expect(page.locator('#share-btn')).toHaveText('Share Result', { timeout: 3000 });
});

test('restarting during a ghost replay cancels the pending moves', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem(
            'typingGameBests',
            JSON.stringify({
                'time:60s:common': {
                    wpm: 40,
                    keystrokes: Array.from({ length: 30 }, (_, i) => ({
                        t: 100 + i * 200,
                        i: i + 1,
                    })),
                },
            })
        );
        localStorage.setItem('typingGameSettings', JSON.stringify({ isGhostEnabled: true }));
    });
    const errors = collectErrors(page);
    await page.goto('/');

    await expect(page.locator('#ghost-badge')).toBeVisible();
    await expect(page.locator('#ghost-cursor')).toHaveCount(1);

    const quote = await currentQuote(page);
    await input(page).press(quote[0]);
    expect(await page.evaluate(() => runtime.ghostTimeouts.length)).toBe(30);
    await expect(page.locator('#ghost-cursor')).toHaveCSS('opacity', '1');

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => [runtime.isStarted, runtime.ghostTimeouts.length])).toEqual([
        false,
        0,
    ]);

    // Wait past the time the old moves would have fired; the new cursor stays put.
    await page.waitForTimeout(800);
    await expect(page.locator('#ghost-cursor')).toHaveCSS('opacity', '0');
    expect(errors).toEqual([]);
});

test.describe('input', () => {
    test('arrow keys, select-all, and clicks cannot move the caret off the end', async ({
        page,
    }) => {
        await page.goto('/');
        const quote = await currentQuote(page);

        await input(page).pressSequentially(quote.slice(0, 3));
        await input(page).press('ArrowLeft');
        await input(page).press('ArrowLeft');
        await input(page).press('Home');
        await input(page).press(quote[3]);
        await input(page).press('ControlOrMeta+a');
        await input(page).press(quote[4]);
        await input(page).click({ position: { x: 5, y: 5 } });
        await input(page).press(quote[5]);

        const state = await page.evaluate(() => ({
            value: typingInputElement.value,
            mistakes: runtime.mistakes,
            incorrect: document.querySelectorAll('#quote-display .incorrect').length,
        }));
        expect(state).toEqual({ value: quote.slice(0, 6), mistakes: 0, incorrect: 0 });
    });

    test('counts composed text from on-screen keyboards once per character', async ({ page }) => {
        await page.goto('/');
        const quote = await currentQuote(page);
        const word = quote.slice(0, 5);

        // Android keyboards resend the whole word being composed on every key.
        await page.evaluate((text) => {
            for (let n = 1; n <= text.length; n++) {
                typingInputElement.value = text.slice(0, n);
                typingInputElement.dispatchEvent(
                    new InputEvent('input', {
                        inputType: 'insertCompositionText',
                        data: text.slice(0, n),
                    })
                );
            }
        }, word);
        expect(await page.evaluate(() => [runtime.keystrokes, runtime.mistakes])).toEqual([5, 0]);

        // Autocorrect replaces text with inputType insertReplacementText and no data.
        const wrong = quote[5] === 'x' ? 'y' : 'x';
        await page.evaluate(
            ([before, after]) => {
                typingInputElement.value = before;
                typingInputElement.dispatchEvent(
                    new InputEvent('input', { inputType: 'insertText', data: before.slice(-1) })
                );
                typingInputElement.value = after;
                typingInputElement.dispatchEvent(
                    new InputEvent('input', { inputType: 'insertReplacementText', data: null })
                );
            },
            [word + wrong, quote.slice(0, 6)]
        );
        expect(await page.evaluate(() => [runtime.keystrokes, runtime.mistakes])).toEqual([7, 1]);
    });

    test('time mode ignores characters typed after the clock reaches zero', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await page.goto('/');
        // Paused, so the 250 ms interval only fires when the test says so.
        await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
        const quote = await currentQuote(page);
        await input(page).pressSequentially(quote.slice(0, 5));
        await page.clock.runFor(59_900);

        // Move past the deadline without letting the 250 ms interval fire.
        const start = await page.evaluate(() => runtime.startTime);
        await page.clock.setSystemTime(start + 60_200);
        await input(page).press(quote[5]);

        expect(await page.evaluate(() => [runtime.correctChars, runtime.isStarted])).toEqual([
            5,
            false,
        ]);
        await expect(page.locator('#result-modal')).toHaveClass(/show/);
        expect(await page.evaluate(() => runtime.endTime - runtime.startTime)).toBe(60_000);
    });

    test('accuracy is below 100 whenever there is a mistake', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            runtime.keystrokes = 250;
            runtime.mistakes = 1;
        });
        await page.evaluate(() => updateMetrics());
        await expect(page.locator('#accuracy')).toHaveText('99');
    });
});

test('ghost cursor lines up with its character while focus mode scales the text', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        localStorage.setItem(
            'typingGameBests',
            JSON.stringify({
                'time:60s:common': { wpm: 40, keystrokes: [{ t: 0, i: 30 }] },
            })
        );
        localStorage.setItem('typingGameSettings', JSON.stringify({ isGhostEnabled: true }));
    });
    await page.goto('/');
    const quote = await currentQuote(page);
    await input(page).press(quote[0]);
    await expect(page.locator('#ghost-cursor')).toHaveCSS('opacity', '1');

    const offset = await page.evaluate(() => {
        const span = document.querySelectorAll('#quote-display span')[30];
        const cursor = document.getElementById('ghost-cursor');
        return Math.abs(cursor.getBoundingClientRect().left - span.getBoundingClientRect().left);
    });
    expect(offset).toBeLessThan(1);
});

test.describe('accessibility', () => {
    const contrastViolations = async (page) => {
        const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        return results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
    };

    test('text meets WCAG AA contrast on the main screen and in both dialogs', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        expect(await contrastViolations(page)).toEqual([]);

        await page.locator('#settings-btn').click();
        expect(await contrastViolations(page)).toEqual([]);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');

        await input(page).pressSequentially(await currentQuote(page));
        await expect(page.locator('#result-modal')).toHaveClass(/show/);
        expect(await contrastViolations(page)).toEqual([]);
    });

    test('screen readers get the passage, pill state, and result values', async ({ page }) => {
        await page.goto('/');
        await expect(input(page)).toHaveAttribute('aria-describedby', 'quote-text');
        await expect(page.locator('#quote-text')).toHaveText(await currentQuote(page));

        // Time mode replaces the passage mid-run; the hidden copy follows.
        await input(page).pressSequentially(await currentQuote(page));
        await expect(page.locator('#quote-text')).toHaveText(await currentQuote(page));
        await page.keyboard.press('Tab');

        await page.locator('#settings-btn').click();
        await expect(page.locator('#mode-selector [data-value="time"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await page.locator('#mode-selector [data-value="words"]').click();
        await expect(page.locator('#mode-selector [data-value="time"]')).toHaveAttribute(
            'aria-pressed',
            'false'
        );
        await expect(page.locator('#mode-selector [data-value="words"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await page.keyboard.press('Escape');

        await expect(page.locator('#result-modal')).toHaveAttribute(
            'aria-describedby',
            'result-stats'
        );
    });
});

test.describe('focus hint', () => {
    test('appears when the input loses focus and a letter key brings typing back', async ({
        page,
    }) => {
        await page.goto('/');
        await expect(page.locator('#focus-hint')).toBeHidden();

        await page.locator('header h1').click();
        await expect(page.locator('#focus-hint')).toBeVisible();

        const quote = await currentQuote(page);
        await page.keyboard.press(quote[0]);
        await expect(input(page)).toBeFocused();
        await expect(page.locator('#focus-hint')).toBeHidden();
        await expect(input(page)).toHaveValue(quote[0]);
    });

    test('does not appear behind an open dialog', async ({ page }) => {
        await page.goto('/');
        await page.locator('#settings-btn').click();
        await expect(page.locator('#settings-modal')).toHaveClass(/show/);
        await expect(page.locator('#focus-hint')).toBeHidden();
    });
});

test('hard mode blurs typed characters and leaves the rest readable', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('typingGameSettings', JSON.stringify({ isHardMode: true }));
    });
    await page.goto('/');
    const quote = await currentQuote(page);
    await input(page).pressSequentially(quote.slice(0, 3));

    const spans = page.locator('#quote-display span');
    await expect(spans.nth(0)).toHaveCSS('filter', 'blur(4px)');
    await expect(spans.nth(2)).toHaveCSS('filter', 'blur(4px)');
    await expect(spans.nth(3)).toHaveCSS('filter', 'none');
    await expect(spans.nth(10)).toHaveCSS('filter', 'none');
});

test.describe('sound', () => {
    // Counts AudioContexts and tones without making noise.
    const stubAudio = () => {
        window.audio = { contexts: 0, tones: 0 };
        const param = {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
        };
        class FakeAudioContext {
            constructor() {
                window.audio.contexts++;
                this.state = 'running';
                this.currentTime = 0;
                this.destination = {};
            }
            createOscillator() {
                window.audio.tones++;
                return { connect() {}, frequency: param, start() {}, stop() {} };
            }
            createGain() {
                return { connect() {}, gain: param };
            }
            resume() {}
        }
        window.AudioContext = FakeAudioContext;
        window.webkitAudioContext = FakeAudioContext;
    };

    test('creates the audio context on the first keystroke, not at load', async ({ page }) => {
        await page.addInitScript(stubAudio);
        await page.goto('/');
        expect(await page.evaluate(() => window.audio)).toEqual({ contexts: 0, tones: 0 });

        await input(page).press((await currentQuote(page))[0]);
        expect(await page.evaluate(() => window.audio)).toEqual({ contexts: 1, tones: 1 });
    });

    test('plays nothing when turned off', async ({ page }) => {
        await page.addInitScript(stubAudio);
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ isSoundEnabled: false }));
        });
        await page.goto('/');
        await input(page).pressSequentially((await currentQuote(page)).slice(0, 5));
        expect(await page.evaluate(() => window.audio)).toEqual({ contexts: 0, tones: 0 });
    });
});

test('feature toggles are saved and applied after a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await page.locator('label', { hasText: 'Sound Effects' }).click();
    await page.locator('label', { hasText: 'Hard Mode' }).click();
    await page.locator('label', { hasText: 'Ghost Mode' }).click();
    await page.locator('#close-settings-btn').click();

    await page.reload();
    await expect(page.locator('#sound-toggle-settings')).not.toBeChecked();
    await expect(page.locator('#hard-mode-toggle-settings')).toBeChecked();
    await expect(page.locator('#ghost-mode-toggle')).toBeChecked();
    await expect(page.locator('#quote-display')).toHaveClass(/blurred/);
    await expect(page.locator('#ghost-badge')).toBeVisible();
});

test('share opens the system share sheet on touch devices', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: false });
    const page = await context.newPage();
    await page.addInitScript(() => {
        // Report a touch screen and record what would be shared.
        const coarse = window.matchMedia('(pointer: coarse)');
        window.matchMedia = (query) =>
            query === '(pointer: coarse)' ? { ...coarse, matches: true } : coarse;
        navigator.share = async (data) => {
            window.sharedData = data;
        };
    });
    await page.goto('/');
    await page.evaluate(() => {
        gameState.mode = 'words';
    });
    await page.locator('#reset-button').click();
    await input(page).pressSequentially(await currentQuote(page));
    await page.locator('#share-btn').click();

    const shared = await page.evaluate(() => window.sharedData);
    expect(shared.url).toBe('https://tmhsdigital.github.io/Typing-Game/');
    expect(shared.text).toMatch(/^\d+ WPM, \d+% accuracy, 10 words Common Words on TypeSpeed$/);
    await context.close();
});

test.describe('text', () => {
    test('defaults to common words with no word twice in a row', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#category-select')).toHaveValue('common');
        const words = (await currentQuote(page)).split(' ');
        expect(words).toHaveLength(25);
        const known = await page.evaluate(() => COMMON_WORDS);
        for (const word of words) expect(known).toContain(word);
        for (let i = 1; i < words.length; i++) expect(words[i]).not.toBe(words[i - 1]);
    });

    test('ten 50-word runs share no five-word sequence', async ({ page }) => {
        await page.goto('/');
        const texts = await page.evaluate(() => {
            gameState.mode = 'words';
            gameState.wordCount = 50;
            return Array.from({ length: 10 }, () => getPassage().text);
        });
        const seen = new Set();
        for (const text of texts) {
            const words = text.split(' ');
            expect(words).toHaveLength(50);
            for (let i = 0; i + 5 <= words.length; i++) {
                const gram = words.slice(i, i + 5).join(' ');
                expect(seen.has(gram)).toBe(false);
                seen.add(gram);
            }
        }
    });

    test('punctuation and numbers change the text and get their own best scores', async ({
        page,
    }) => {
        await page.goto('/');
        const result = await page.evaluate(() => {
            gameState.mode = 'words';
            gameState.wordCount = 50;
            gameState.hasPunctuation = true;
            gameState.hasNumbers = true;
            const texts = Array.from({ length: 5 }, () => getPassage().text).join(' ');
            return { texts, key: settingsKey() };
        });
        // Each sentence starts with a capital, or with a number in its place.
        for (const sentence of result.texts.split(/[.?] /)) {
            expect(sentence).toMatch(/^[A-Z0-9]/);
        }
        expect(result.texts).toMatch(/[.?]$/);
        expect(result.texts).toMatch(/,/);
        expect(result.texts).toMatch(/\d/);
        expect(result.key).toBe('words:50w:common+punctuation+numbers');

        // The toggles are in Settings and are saved.
        await page.evaluate(() => {
            gameState.hasPunctuation = false;
            gameState.hasNumbers = false;
        });
        await page.locator('#settings-btn').click();
        await page.locator('label', { hasText: 'Punctuation' }).click();
        await page.locator('#close-settings-btn').click();
        expect(
            await page.evaluate(() => JSON.parse(localStorage.getItem('typingGameSettings')))
        ).toMatchObject({ hasPunctuation: true, hasNumbers: false });
    });

    test('every quote category has at least 50 passages', async ({ page }) => {
        await page.goto('/');
        const counts = await page.evaluate(() =>
            Object.fromEntries(Object.entries(QUOTES).map(([key, list]) => [key, list.length]))
        );
        expect(counts.general).toBeGreaterThanOrEqual(50);
        expect(counts.technology).toBeGreaterThanOrEqual(50);
    });

    test('the result dialog shows where the passage is from', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ category: 'general' }));
            // Always pick the last quote, which has a source.
            Math.random = () => 0.9999;
        });
        await page.clock.install();
        await page.goto('/');
        const source = await page.evaluate(() => runtime.quoteSource);
        expect(source).not.toBe('');

        await input(page).press((await currentQuote(page))[0]);
        await page.clock.runFor(61_000);
        await expect(page.locator('#modal-source')).toHaveText(source);
    });

    test('the result dialog hides the source line for common words', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            gameState.mode = 'words';
        });
        await page.locator('#reset-button').click();
        await input(page).pressSequentially(await currentQuote(page));
        await expect(page.locator('#result-modal')).toHaveClass(/show/);
        await expect(page.locator('#modal-source')).toBeHidden();
    });
});

test.describe('practice options', () => {
    test('stop on error counts the mistake and keeps the caret in place', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ isStopOnError: true }));
        });
        await page.goto('/');
        await expect(page.locator('#stop-on-error-toggle')).toBeChecked();
        const quote = await currentQuote(page);
        const wrongKey = quote[2] === 'x' ? 'y' : 'x';

        await input(page).pressSequentially(quote.slice(0, 2));
        await input(page).press(wrongKey);
        await expect(input(page)).toHaveValue(quote.slice(0, 2));
        await expect(page.locator('#mistakes')).toHaveText('1');
        await expect(page.locator('#quote-display span').nth(2)).toHaveClass('current');

        await input(page).press(quote[2]);
        await expect(input(page)).toHaveValue(quote.slice(0, 3));
        await expect(page.locator('#quote-display .incorrect')).toHaveCount(0);
    });

    test('warns while Caps Lock is on', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#caps-warning')).toBeHidden();

        const press = (capsLock) =>
            page.evaluate((caps) => {
                typingInputElement.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'A', modifierCapsLock: caps })
                );
            }, capsLock);
        await press(true);
        await expect(page.locator('#caps-warning')).toBeVisible();
        await press(false);
        await expect(page.locator('#caps-warning')).toBeHidden();
    });
});

test('mode and length can be changed from the main screen', async ({ page }) => {
    await page.goto('/');
    await page.locator('#quick-mode [data-value="words"]').click();
    await expect(page.locator('#quick-word-count')).toBeVisible();
    await expect(page.locator('#quick-duration')).toBeHidden();
    await page.locator('#quick-word-count [data-value="25"]').click();

    expect((await currentQuote(page)).split(' ')).toHaveLength(25);
    await expect(input(page)).toBeFocused();
    await expect(page.locator('#quick-word-count [data-value="25"]')).toHaveAttribute(
        'aria-pressed',
        'true'
    );
    expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('typingGameSettings')))
    ).toMatchObject({ mode: 'words', wordCount: 25 });

    // The Settings dialog shows the same values.
    await page.locator('#settings-btn').click();
    await expect(page.locator('#word-count-selector .pill.active')).toHaveText('25');
    await page.keyboard.press('Escape');

    // Keyboard works too.
    await page.locator('#quick-mode [data-value="time"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#timer')).toHaveText('60');
});

test('the result dialog shows raw WPM, characters, time, the run chart, and a new best', async ({
    page,
}) => {
    await page.addInitScript(() => {
        localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        localStorage.setItem(
            'typingGameBests',
            JSON.stringify({ 'words:10w:common': { wpm: 1, keystrokes: [] } })
        );
    });
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto('/');
    await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
    const quote = await currentQuote(page);
    const wrongKey = quote[1] === 'x' ? 'y' : 'x';

    // One wrong character left in place, the rest typed over 30 seconds.
    await input(page).press(quote[0]);
    await input(page).press(wrongKey);
    await page.clock.runFor(10_000);
    await input(page).pressSequentially(quote.slice(2, 20));
    await page.clock.runFor(20_000);
    await input(page).pressSequentially(quote.slice(20));
    await expect(page.locator('#result-modal')).toHaveClass(/show/);

    const n = quote.length;
    await expect(page.locator('#modal-time')).toHaveText('30.0s');
    await expect(page.locator('#modal-chars')).toHaveText(`${n - 1} correct, 1 wrong`);
    await expect(page.locator('#modal-raw')).toHaveText(String(Math.round(n / 5 / 0.5)));
    await expect(page.locator('#modal-wpm')).toHaveText(String(Math.round((n - 1) / 5 / 0.5)));
    await expect(page.locator('#modal-best')).toHaveText(
        'New best for these settings. Previous best: 1 WPM.'
    );
    await expect(page.locator('#run-chart-container')).toBeVisible();
    const segments = await page
        .locator('#run-chart polyline')
        .evaluate((line) => line.getAttribute('points').split(' ').length);
    expect(segments).toBe(30);
});

test('the result dialog names the standing best when a run does not beat it', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        localStorage.setItem(
            'typingGameBests',
            JSON.stringify({ 'words:10w:common': { wpm: 999, keystrokes: [] } })
        );
    });
    await page.goto('/');
    await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
    await expect(page.locator('#modal-best')).toHaveText('Best for these settings: 999 WPM.');
    await expect(page.locator('#modal-best')).not.toHaveClass(/new-best/);
});

test('the result dialog is positioned against the viewport, not the page card', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
        localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        localStorage.setItem(
            'typingGameHistory',
            JSON.stringify([50, 40].map((wpm) => ({ wpm, accuracy: 100, key: 'words:10w:common' })))
        );
    });
    await page.goto('/');
    await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
    await expect(page.locator('#result-modal')).toHaveClass(/show/);

    const overlay = await page.locator('#result-modal').boundingBox();
    expect(overlay).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
    const title = await page.locator('#result-title').boundingBox();
    expect(title.y).toBeGreaterThanOrEqual(0);
});

test.describe('weak keys', () => {
    test('counts misses per expected key and shows the most missed after a run', async ({
        page,
    }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        });
        await page.goto('/');
        const quote = await currentQuote(page);
        const wrong = (c) => (c === 'x' ? 'y' : 'x');

        // Miss the first character twice, fixing it each time.
        await input(page).press(wrong(quote[0]));
        await input(page).press('Backspace');
        await input(page).press(wrong(quote[0]));
        await input(page).press('Backspace');
        await input(page).pressSequentially(quote, { delay: 40 });

        const stat = await page.evaluate((key) => runtime.keyStats[key], quote[0]);
        expect(stat.misses).toBe(2);
        expect(stat.attempts).toBeGreaterThanOrEqual(3);
        await expect(page.locator('#modal-keys')).toHaveText(
            new RegExp(`^Most missed keys: ${quote[0]} \\(2 of \\d+\\)$`)
        );

        // The totals are saved and survive a reload.
        await page.reload();
        const saved = await page.evaluate(
            (key) => JSON.parse(localStorage.getItem('typingGameKeyStats'))[key],
            quote[0]
        );
        expect(saved).toEqual(stat);
    });

    test('Practice weak keys starts a run of words containing the weakest letters', async ({
        page,
    }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
            localStorage.setItem(
                'typingGameKeyStats',
                JSON.stringify({
                    k: { attempts: 10, misses: 5 },
                    v: { attempts: 10, misses: 4 },
                    e: { attempts: 100, misses: 1 },
                    w: { attempts: 2, misses: 2 }, // too few attempts to count
                    ';': { attempts: 10, misses: 9 }, // not a letter
                })
            );
        });
        await page.goto('/');
        await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
        await expect(page.locator('#practice-btn')).toBeVisible();
        await page.locator('#practice-btn').click();

        await expect(page.locator('#category-select')).toHaveValue('weak');
        await expect(page.locator('#practice-note')).toHaveText('Practicing: k, v, e');
        const words = (await currentQuote(page)).split(' ');
        expect(words).toHaveLength(10);
        for (const word of words) expect(word).toMatch(/[kve]/);
        expect(await page.evaluate(() => settingsKey())).toBe('words:10w:weak');
    });

    test('hides the practice button until a letter has enough misses', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('typingGameSettings', JSON.stringify({ mode: 'words' }));
        });
        await page.goto('/');
        await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
        await expect(page.locator('#modal-keys')).toHaveText('No missed keys.');
        await expect(page.locator('#practice-btn')).toBeHidden();
    });
});

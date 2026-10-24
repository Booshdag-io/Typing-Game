// End-to-end tests against the real page. page.evaluate callbacks run in the
// browser, where script.js's top-level consts are in scope.
/* global runtime, gameState, resultModal, typingInputElement, wpmElement, updateMetrics */

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
        await expect(page.locator('#mode-badge')).toHaveText('60s');

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
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
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
        await expect(page.locator('#mode-badge')).toHaveText('10 words');
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
        await expect(page.locator('.chart-container')).toBeHidden();

        const history = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('typingGameHistory'))
        );
        expect(history).toHaveLength(1);
        expect(history[0].mode).toBe('words');
        expect(history[0].key).toBe('words:10w:general');

        // A second run makes the chart appear.
        await page.keyboard.press('Enter');
        await expect(input(page)).toBeFocused();
        await input(page).pressSequentially(await currentQuote(page), { delay: 40 });
        await expect(page.locator('.chart-container')).toBeVisible();
        await expect(page.locator('#chart-caption')).toHaveText(/^Last 2 runs/);
        await expect(page.locator('#progress-chart circle')).toHaveCount(2);

        // Settings survive a reload.
        await page.reload();
        await expect(page.locator('#mode-badge')).toHaveText('10 words');
    });
});

test.describe('best scores', () => {
    test('are kept per mode, length, and category', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem(
                'typingGameBests',
                JSON.stringify({
                    'time:60s:general': { wpm: 40, keystrokes: [] },
                    'words:10w:general': { wpm: 70, keystrokes: [] },
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

test('share copies a summary to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.evaluate(() => {
        gameState.mode = 'words';
    });
    await page.locator('#reset-button').click();
    await input(page).pressSequentially(await currentQuote(page));
    await expect(page.locator('#result-modal')).toHaveClass(/show/);

    await page.locator('#share-btn').click();
    await expect(page.locator('#share-btn')).toHaveText('Copied!');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/^\d+ WPM at \d+% accuracy on TypeSpeed$/);
    await expect(page.locator('#share-btn')).toHaveText('Share Result', { timeout: 3000 });
});

test('restarting during a ghost replay cancels the pending moves', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem(
            'typingGameBests',
            JSON.stringify({
                'time:60s:general': {
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
                'time:60s:general': { wpm: 40, keystrokes: [{ t: 0, i: 30 }] },
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

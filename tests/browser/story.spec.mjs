import {test, expect} from '@playwright/test';
test('static story, scrubber, comparison and sources work offline after load', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => {errors.push(e.message); console.error(e.message);});
  page.on('requestfailed', r => console.error(r.url(), r.failure()?.errorText));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#year')).toHaveText('2021');
  // All application resources are committed; the demo needs no external services.
  await page.context().setOffline(true);
  await page.locator('#watchStory').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Pause timeline');
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Play timeline');
  await page.locator('#time').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#year')).toHaveText('2023');
  await page.locator('#revealStory').click();
  await expect(page.locator('#year')).toHaveText('2024');
  await expect(page.locator('#answer')).toBeVisible();
  await expect(page.locator('.ranking tbody tr')).toHaveCount(5);
  await page.locator('#answerSources').click();
  await expect(page.locator('#sources')).toBeVisible();
  await expect(page.locator('#sourceDetails')).toContainText('90% confidence');
  await expect(page.locator('#sourceLinks a')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('automatic finale, replay, and manual scrubbing do not leave a live timer', async ({page}) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#watchStory').click();
  await page.clock.runFor(8000);
  await expect(page.locator('#year')).toHaveText('2024');
  await expect(page.locator('#answer')).toBeVisible();
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Play timeline');
  await page.locator('#watchStory').click();
  await expect(page.locator('#year')).toHaveText('2021');
  await expect(page.locator('#answer')).toBeHidden();
  await page.locator('#time').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await page.clock.runFor(10000);
  await expect(page.locator('#year')).toHaveText('2023');
  await expect(page.locator('#answer')).toBeHidden();
});

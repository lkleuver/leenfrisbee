import { expect, test, type Page } from '@playwright/test';

const layerVisibility = (page: Page, layer: string) =>
  page.evaluate((l) => window.__map?.getLayoutProperty(l, 'visibility') ?? 'visible', layer);

const openList = async (page: Page, isMobile: boolean) => {
  if (isMobile) await page.getByRole('button', { name: /Zoek|Search/ }).click();
};

test('loads the map and lists locations', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('search narrows the list and picking an item opens its details', async ({ page, isMobile }) => {
  await page.goto('./');
  await openList(page, isMobile);
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await page.getByRole('searchbox').fill('grift');
  await expect(items).toHaveCount(1);
  await items.first().getByRole('button').click();
  await expect(page.getByRole('heading', { level: 2, name: 'Griftpark' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Route|Directions/ })).toHaveAttribute('href', /google\.com\/maps/);
  await page.getByRole('button', { name: /Terug|Back/ }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
});

test('layer chips toggle map layers and list contents', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await page.waitForFunction(() => window.__map?.getLayer('club') !== undefined);
  expect(await layerVisibility(page, 'club')).toBe('visible');
  await page.getByRole('button', { name: /^(Clubs)$/ }).click();
  await expect.poll(() => layerVisibility(page, 'club')).toBe('none');
  await openList(page, isMobile);
  await expect(page.getByRole('listitem')).toHaveCount(2);
});

test('language toggle switches ui strings and persists', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee cabinets');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee cabinets');
});

import { expect, test, type Page } from '@playwright/test';

const layerVisibility = (page: Page, layer: string) =>
  page.evaluate((l) => window.__map?.getLayoutProperty(l, 'visibility') ?? 'visible', layer);

const openList = async (page: Page, isMobile: boolean) => {
  if (isMobile) await page.getByRole('button', { name: /Zoek|Search/ }).click();
};

// Derive expectations from the GeoJSON the page actually serves, so the suite stays green
// no matter what the editor puts in data/*.csv (see data/README.md).
const loadCounts = (page: Page) =>
  page.evaluate(async () => {
    const get = async (f: string) =>
      (await (await fetch(`./data/${f}.geojson`)).json()).features as Array<{ properties: { naam: string } }>;
    const [k, c] = await Promise.all([get('kastjes'), get('clubs')]);
    return { total: k.length + c.length, kastjes: k.length, clubs: c.length, firstKastje: k[0]?.properties.naam ?? '' };
  });

test.beforeEach(async ({ page }) => {
  // Keep the suite hermetic: no request should ever reach the live PDOK style API.
  await page.route('**/api.pdok.nl/**', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
  await page.goto('./');
});

test('loads the map and lists locations', async ({ page }) => {
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('search narrows the list and picking an item opens its details', async ({ page, isMobile }) => {
  const counts = await loadCounts(page);
  await openList(page, isMobile);
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(counts.total);
  await page.getByRole('searchbox').fill(counts.firstKastje);
  await expect.poll(() => items.count()).toBeGreaterThanOrEqual(1);
  await items.first().getByRole('button').click();
  await expect(page.getByRole('heading', { level: 2, name: counts.firstKastje })).toBeVisible();
  await expect(page.getByRole('link', { name: /Route|Directions/ })).toHaveAttribute('href', /google\.com\/maps/);
  await page.getByRole('button', { name: /Terug|Back/ }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
});

test('layer chips toggle map layers and list contents', async ({ page, isMobile }) => {
  const counts = await loadCounts(page);
  test.skip(counts.clubs === 0, 'no clubs in the current data set');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await page.waitForFunction(() => window.__map?.getLayer('club') !== undefined);
  expect(await layerVisibility(page, 'club')).toBe('visible');
  await page.getByRole('button', { name: /^(Clubs)$/ }).click();
  await expect.poll(() => layerVisibility(page, 'club')).toBe('none');
  await openList(page, isMobile);
  await expect(page.getByRole('listitem')).toHaveCount(counts.kastjes);
});

test('language toggle switches ui strings and persists', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee cabinets');
  await page.getByRole('button', { name: 'NL', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee kastjes');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leenfrisbee kastjes');
});

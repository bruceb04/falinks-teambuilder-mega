import { expect, test } from '@playwright/test';

// The default format is the current Champions regulation, so a new room is a Champions room.
const roomUrl = (baseURL: string | undefined, name: string) => `${baseURL || 'http://localhost:3000'}/room/${name}`;

test('should build a Champions set with Stat Points and without IVs', async ({ page, baseURL, browserName }) => {
  await page.goto(roomUrl(baseURL, `champions${Date.now()}${browserName}`), { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Add a new tab' }).click();

  // Species: a Pokémon that Scarlet/Violet does not have, but Champions does
  await page.getByPlaceholder('Pokémon').click();
  await page.getByPlaceholder('Pokémon').press('Control+a');
  await page.getByPlaceholder('Pokémon').fill('floette-e');
  await page.getByRole('cell', { name: 'Floette-Eternal' }).click();

  // Item: a Mega Stone that Champions introduced
  await page.getByPlaceholder('Item').click();
  await page.getByPlaceholder('Item').fill('floettite');
  await page.getByRole('cell', { name: 'Floettite' }).click();

  // A move that Floette-Eternal only has because it is in its Champions move pool
  await page.getByPlaceholder('Move 1').click();
  await page.getByPlaceholder('Move 1').fill('light of ruin');
  await page.getByRole('cell', { name: 'Light of Ruin' }).click();

  // Stats: IVs are read-only, and the budget is 66 Stat Points with 32 per stat
  await page.getByText('Stats').click();
  const hpIv = page.getByRole('spinbutton', { name: 'hp IV input' });
  await expect(hpIv).toBeDisabled();
  await expect(hpIv).toHaveValue('31');

  await page.locator('#nature').selectOption('Modest');
  const spa = page.getByRole('spinbutton', { name: 'spa EV input' });
  await spa.fill('40'); // over the per-stat cap
  await spa.press('Enter');
  await expect(spa).toHaveValue('32');
  const spe = page.getByRole('spinbutton', { name: 'spe EV input' });
  await spe.fill('32');
  await spe.press('Enter');
  const hp = page.getByRole('spinbutton', { name: 'hp EV input' });
  await hp.fill('2');
  await hp.press('Enter');

  // 2 HP / 32 SpA / 32 Spe spends the whole budget, and every point is worth +1
  await expect(page.getByRole('cell', { name: 'hp stat' })).toHaveText('151');
  await expect(page.getByRole('cell', { name: 'spa stat' })).toHaveText('192');
  await expect(page.getByRole('cell', { name: 'spe stat' })).toHaveText('144');
});

test('should only offer Pokémon of the Regulation M-B roster', async ({ page, baseURL, browserName }) => {
  await page.goto(roomUrl(baseURL, `roster${Date.now()}${browserName}`), { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Add a new tab' }).click();
  await page.getByPlaceholder('Pokémon').click();

  // Dondozo is a Scarlet/Violet Pokémon that Champions does not have
  await page.getByPlaceholder('Pokémon').press('Control+a');
  await page.getByPlaceholder('Pokémon').fill('dondozo');
  await expect(page.getByRole('cell', { name: 'Dondozo' })).toHaveCount(0);

  // a Mega forme is not a pick of its own: it comes from holding the Mega Stone
  await page.getByPlaceholder('Pokémon').press('Control+a');
  await page.getByPlaceholder('Pokémon').fill('meganium');
  await expect(page.getByRole('cell', { name: 'Meganium-Mega' })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Meganium' })).toHaveCount(1);
});

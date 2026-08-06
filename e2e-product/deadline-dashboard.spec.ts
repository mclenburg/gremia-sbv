import { test, expect, openModule, assertNoRuntimeErrors, reloadAndUnlock } from './support/productTest';

test.describe.configure({ mode: 'serial' });

let deadlineId = '';
const title = `E2E Wiedervorlage ${Date.now()}`;

test('Wiedervorlage innerhalb 48 Stunden erscheint wirklich im Dashboard', async ({ productPage, runtimeErrors }) => {
  const created = await productPage.evaluate(async ({ deadlineTitle }) => window.gremiaSbv.deadlines.create({
    processType: 'custom', deadlineType: 'follow_up', title: deadlineTitle,
    dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), severity: 'important',
  }), { deadlineTitle: title });
  deadlineId = created.id;
  const dashboardRows = await productPage.evaluate(async () => window.gremiaSbv.deadlines.dashboard());
  expect(dashboardRows.some((row) => row.id === deadlineId)).toBe(true);
  await reloadAndUnlock(productPage);
  await openModule(productPage, 'Dashboard');
  await expect(productPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Änderung der Wiedervorlage wird in Liste und Dashboard sichtbar', async ({ productPage, runtimeErrors }) => {
  const changedTitle = `${title} geändert`;
  await productPage.evaluate(async ({ id, nextTitle }) => window.gremiaSbv.deadlines.update(id, { title: nextTitle, severity: 'critical' }), { id: deadlineId, nextTitle: changedTitle });
  await reloadAndUnlock(productPage);
  await openModule(productPage, 'Fristen');
  await expect(productPage.getByText(changedTitle, { exact: true })).toBeVisible();
  await openModule(productPage, 'Dashboard');
  await expect(productPage.getByRole('heading', { name: changedTitle, exact: true })).toBeVisible();
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Erledigte Wiedervorlage verschwindet aus dem Dashboard', async ({ productPage, runtimeErrors }) => {
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.deadlines.complete(id, 'E2E erledigt'), { id: deadlineId });
  const dashboardRows = await productPage.evaluate(async () => window.gremiaSbv.deadlines.dashboard());
  expect(dashboardRows.some((row) => row.id === deadlineId)).toBe(false);
  await reloadAndUnlock(productPage);
  await openModule(productPage, 'Dashboard');
  await expect(productPage.getByRole('heading', { name: `${title} geändert`, exact: true })).toHaveCount(0);
  await assertNoRuntimeErrors(runtimeErrors);
});

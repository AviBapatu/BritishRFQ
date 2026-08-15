import { test, expect, request } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000/api';

// Helper: create a fresh, currently-active RFQ via the REST API
async function createActiveRFQ() {
  const ctx = await request.newContext();
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();   // 5 min ago
  const closeAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();   // 1 hour from now
  const forcedAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
  const pickupAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now

  const response = await ctx.post(`${API_BASE}/rfqs`, {
    data: {
      title: 'Playwright E2E Test Auction',
      bid_start_at: startAt,
      bid_close_at: closeAt,
      forced_close_at: forcedAt,
      pickup_date: pickupAt,
      trigger_window_minutes: 5,
      extension_minutes: 5,
      extension_trigger: 'ANY_RANK_CHANGE'
    }
  });
  const rfq = await response.json();
  await ctx.dispose();
  return rfq;
}

test.describe('British Auction Real-Time Constraints', () => {

  test('Real-time WebSocket bid broadcast between two suppliers', async ({ browser }) => {
    const rfq = await createActiveRFQ();
    const rfqId = rfq.id;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const pageBConnected = pageB.waitForEvent('console', {
      predicate: msg => msg.text().includes(`Connected to WebSocket for RFQ: ${rfqId}`),
      timeout: 10000
    });

    await pageA.goto(`${FRONTEND_URL}/auctions/${rfqId}`);
    await pageB.goto(`${FRONTEND_URL}/auctions/${rfqId}`);

    await expect(pageA.getByText('Auction Information')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText('Auction Information')).toBeVisible({ timeout: 10000 });

    await pageBConnected;

    await pageA.getByLabel('Freight Charge (£)').fill('4500');
    await pageA.getByRole('button', { name: 'Submit Bid' }).click();

    await expect(pageA.getByText('£4500.00')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText('£4500.00')).toBeVisible({ timeout: 15000 });

    await contextA.close();
    await contextB.close();
  });

  test('Rejects bids that are higher or equal to the current L1 bid', async ({ page }) => {
    const rfq = await createActiveRFQ();
    const rfqId = rfq.id;

    await page.goto(`${FRONTEND_URL}/auctions/${rfqId}`);
    await expect(page.getByText('Auction Information')).toBeVisible();

    // First bid: £5000
    await page.getByLabel('Freight Charge (£)').fill('5000');
    await page.getByRole('button', { name: 'Submit Bid' }).click();
    await expect(page.getByText('£5000.00')).toBeVisible();

    // Second bid (too high): £5500
    // We expect the backend to reject this and the frontend to show an alert dialog.
    // Playwright auto-dismisses alerts, so we'll listen for it to verify the rejection text!
    let alertMessage = '';
    page.once('dialog', dialog => {
      alertMessage = dialog.message();
      dialog.dismiss();
    });

    await page.getByLabel('Freight Charge (£)').fill('5500');
    await page.getByRole('button', { name: 'Submit Bid' }).click();

    // Wait a moment for the alert to fire
    await page.waitForTimeout(1000);
    expect(alertMessage).toContain('Bid must be strictly lower than the current L1 bid');
  });

  test('Anti-sniping: Extends auction close time if bid is placed in the trigger window', async ({ request, page }) => {
    // We must create an RFQ that closes in exactly 2 minutes (which is inside the 5-minute trigger window)
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const closeAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString(); // Closes in 2 minutes
    const forcedAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const pickupAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request.post(`${API_BASE}/rfqs`, {
      data: {
        title: 'Anti-Sniping Test',
        bid_start_at: startAt,
        bid_close_at: closeAt,
        forced_close_at: forcedAt,
        pickup_date: pickupAt,
        trigger_window_minutes: 5,
        extension_minutes: 5,
        extension_trigger: 'ANY_RANK_CHANGE'
      }
    });
    const rfq = await response.json();

    await page.goto(`${FRONTEND_URL}/auctions/${rfq.id}`);
    
    // Grab the initial close time text
    const initialCountdownText = await page.locator('.text-4xl.font-bold.tracking-tighter').innerText();

    // Place a bid to trigger the extension
    await page.getByLabel('Freight Charge (£)').fill('4000');
    await page.getByRole('button', { name: 'Submit Bid' }).click();
    await expect(page.getByRole('cell', { name: /£4000\.00/ })).toBeVisible({ timeout: 10000 });

    // THE TIGHT ASSERTION: directly query the backend to verify the extension happened
    // and that bid_close_at was extended by exactly extension_minutes (5 min).
    const rfqAfter = await request.get(`${API_BASE}/rfqs/${rfq.id}`);
    const rfqAfterJson = await rfqAfter.json();

    const originalCloseMs = new Date(closeAt).getTime();
    const newCloseMs = new Date(rfqAfterJson.rfq.bid_close_at + "Z").getTime();
    const diffMinutes = Math.round((newCloseMs - originalCloseMs) / 60000);

    expect(diffMinutes).toBe(5); // Exactly 5 minutes were added
  });

});

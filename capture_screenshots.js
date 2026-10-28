import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve('screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function capture() {
  console.log('Launching browser to capture latest screenshots...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Auth Page
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '1_auth_page.png') });
  console.log('1. Captured auth page');

  // Login
  await page.fill('input[type="email"]', 'student@thapar.edu');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // If OTP screen appears, click verify
  const otpBtn = page.locator('button:has-text("Verify OTP & Access Dashboard"), button:has-text("Verify")');
  if (await otpBtn.count() > 0) {
    await page.screenshot({ path: path.join(screenshotDir, '2_otp_screen.png') });
    console.log('2. Captured OTP screen');
    await otpBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // 3. Dashboard
  await page.screenshot({ path: path.join(screenshotDir, '3_dashboard.png') });
  console.log('3. Captured dashboard');

  // 4. Communities Page
  await page.click('button:has-text("City Communities")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '4_communities.png') });
  console.log('4. Captured communities page');

  // 5. Back to Dashboard & Open Journey Form
  await page.click('button:has-text("Dashboard")');
  await page.waitForTimeout(800);
  const findBtns = page.locator('button:has-text("Find Travel Partners")');
  if (await findBtns.count() > 0) {
    await findBtns.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '5_journey_form.png') });
    console.log('5. Captured journey form modal');

    // Submit form to view matching results
    const modalSubmit = page.locator('form button:has-text("Find Travel Partners")');
    if (await modalSubmit.count() > 0) {
      await modalSubmit.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '6_matching_results.png') });
      console.log('6. Captured matching results');
    }
  }

  // 7. My Groups / Group Details
  await page.click('button:has-text("My Groups")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '7_group_details.png') });
  console.log('7. Captured group details');

  // 8. Open Group Chat Modal
  const chatBtn = page.locator('button:has-text("Open Group Chat")');
  if (await chatBtn.count() > 0) {
    await chatBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '8_group_chat.png') });
    console.log('8. Captured group chat');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});

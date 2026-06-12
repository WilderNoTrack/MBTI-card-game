const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'public', 'screenshots');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Home page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'home.png') });
  console.log('saved home.png');

  // 2. Click "创建房间" to open create form
  await page.getByRole('button', { name: '创建房间' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'home-create.png') });
  console.log('saved home-create.png');

  // 3. Back to menu, open join form
  await page.getByText('← 返回').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '加入房间' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'home-join.png') });
  console.log('saved home-join.png');

  // 4. Expand rule panels on both sides for a fuller view
  await page.getByText('← 返回').click();
  await page.getByText('游戏简介 · 属性说明').click();
  await page.getByText('各阵营胜利条件').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'home-rules.png') });
  console.log('saved home-rules.png');

  await browser.close();
})().catch(err => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});

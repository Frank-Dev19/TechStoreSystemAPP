const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1100 });
  await page.goto('http://localhost:4200/technician-panel', { waitUntil: 'networkidle2' });

  if (await page.$('input[type="email"]')) {
    await page.type('input[type="email"]', 'sergioavilare@outlook.es');
    await page.type('input[type="password"]', '74118118');
    await Promise.allSettled([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    ]);
  }

  const data = await page.evaluate(() => ({
    url: location.href,
    text: document.body.innerText.slice(0, 5000),
    links: Array.from(document.querySelectorAll('a')).map(a => ({ text: (a.innerText || '').trim(), href: a.href })),
    buttons: Array.from(document.querySelectorAll('button')).map(b => ({ text: (b.innerText || '').trim(), cls: b.className })),
    storage: {
      local: { ...localStorage },
      session: { ...sessionStorage },
    },
  }));

  await page.screenshot({ path: 'tmp-rbac.png', fullPage: true });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

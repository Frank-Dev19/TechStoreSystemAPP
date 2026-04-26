const puppeteer = require('puppeteer');

async function ensureLoggedIn(page) {
  await page.goto('http://localhost:4200/technician-panel', { waitUntil: 'networkidle2' });

  const emailInput = await page.$('input[type="email"]');
  if (!emailInput) return;

  await page.type('input[type="email"]', 'sergioavilare@outlook.es');
  await page.type('input[type="password"]', '74118118');
  await Promise.allSettled([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
  ]);

  await page.goto('http://localhost:4200/rbac', { waitUntil: 'networkidle2' });
}

async function openTechnicianPanel(page) {
  const links = await page.$$('a');
  for (const link of links) {
    const text = await page.evaluate(el => (el.innerText || '').trim(), link);
    if (text.includes('Panel de técnico')) {
      await Promise.allSettled([
        link.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      ]);
      return true;
    }
  }
  return false;
}

async function clickAgreementButton(page) {
  const candidates = await page.$$('button');
  for (const button of candidates) {
    const text = await page.evaluate(el => (el.innerText || '').trim(), button);
    if (text.includes('Acuerdo')) {
      await button.click();
      return true;
    }
  }
  return false;
}

async function main() {
  const consoleMessages = [];
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => consoleMessages.push({ type: 'pageerror', text: err.message }));
  await page.setViewport({ width: 1280, height: 1100 });

  await ensureLoggedIn(page);
  const panelOpened = await openTechnicianPanel(page);

  const opened = await clickAgreementButton(page);
  if (opened) {
    await page.waitForTimeout(1000);
  }

  const data = await page.evaluate(({ wasOpened, wasPanelOpened }) => {
    const buttons = Array.from(document.querySelectorAll('button')).map((button) => ({
      text: (button.innerText || '').trim(),
      className: button.className,
      title: button.getAttribute('title'),
      ariaLabel: button.getAttribute('aria-label'),
    })).filter((entry) => entry.text || entry.title || entry.ariaLabel);

    const modal = document.querySelector('.agreement-modal');
    const modalHtml = modal ? modal.outerHTML : null;

    return {
      url: location.href,
      panelOpened: wasPanelOpened,
      opened: wasOpened,
      buttons,
      modalExists: Boolean(modal),
      modalHtml,
      appText: document.body.innerText.slice(0, 4000),
      htmlSnippet: document.body.innerHTML.slice(0, 4000),
      readyState: document.readyState,
    };
  }, { wasOpened: opened, wasPanelOpened: panelOpened });

  await page.screenshot({ path: 'tmp-technician-panel.png', fullPage: true });
  console.log(JSON.stringify({ ...data, consoleMessages }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

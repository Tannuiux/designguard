import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: {
    width: 1440,
    height: 900,
  },
})

const page = await context.newPage()

await page.goto('https://www.irs.gov', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})

await page.waitForTimeout(3000)

await page.screenshot({
  path: 'irs-screenshot.png',
  fullPage: true,
})

console.log('IRS screenshot saved: irs-screenshot.png')

await context.close()
await browser.close()

import { Daytona } from '@daytona/sdk'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'

const TARGET_URL = 'https://www.craigslist.org'

async function main() {
  console.log(`\n=== DESIGNGUARD ===`)
  console.log(`Target: ${TARGET_URL}\n`)

  console.log('[1/4] Launching browser...')
const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

  console.log('[2/4] Loading target page...')
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

  console.log('[3/4] Taking screenshot...')
  await page.screenshot({ path: 'designguard-screenshot.png', fullPage: true })
  console.log('Screenshot saved: designguard-screenshot.png')

  console.log('[4/4] Running accessibility scan...')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  console.log(`\n=== DESIGNGUARD REPORT ===`)
  console.log(`Target: ${TARGET_URL}`)
  console.log(`Accessibility violations found: ${results.violations.length}\n`)
  results.violations.forEach((v, i) => {
    console.log(`${i + 1}. [${v.impact}] ${v.id}: ${v.description}`)
    console.log(`   Affected elements: ${v.nodes.length}`)
  })
  console.log('==========================\n')

  fs.writeFileSync('designguard-results.json', JSON.stringify({ targetUrl: TARGET_URL, violations: results.violations }, null, 2))

await context.close()
await browser.close()
  console.log('Done. Run "node generate-report.js" next to build the branded HTML report.')
}

main()
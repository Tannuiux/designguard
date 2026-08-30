import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const TARGET_URL = 'https://example.com'

async function main() {
  console.log(`Launching browser and navigating to ${TARGET_URL}...`)
  const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()
  await page.goto(TARGET_URL)

  console.log('Taking screenshot...')
  await page.screenshot({ path: 'screenshot.png', fullPage: true })

  console.log('Running accessibility scan (WCAG 2.0/2.1 A & AA)...')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  console.log(`\nFound ${results.violations.length} accessibility violation(s):\n`)
  results.violations.forEach((v, i) => {
    console.log(`${i + 1}. [${v.impact}] ${v.id}: ${v.description}`)
    console.log(`   Affected elements: ${v.nodes.length}`)
  })

  await context.close()
  await browser.close()
  console.log('\nDone. Screenshot saved as screenshot.png')
}

main()
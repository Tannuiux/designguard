import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'

const TARGET_URL = 'https://news.ycombinator.com'

async function main() {
  let browser
  let context

  try {
    console.log('Opening Hacker News...')

    browser = await chromium.launch({
      headless: false,
      slowMo: 300,
    })

    context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900,
      },
    })

    const page = await context.newPage()

    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
    })

    console.log('Browser is open — Hacker News will stay visible for 20 seconds...')
    await page.waitForTimeout(20000)

    await page.screenshot({
      path: 'hackernews-screenshot.png',
      fullPage: true,
    })

    console.log('Screenshot saved: hackernews-screenshot.png')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    console.log('\n=== DESIGNGUARD REPORT ===')
    console.log(`Target: ${TARGET_URL}`)
    console.log(`Accessibility violations found: ${results.violations.length}\n`)

    results.violations.forEach((violation, index) => {
      console.log(
        `${index + 1}. [${violation.impact}] ${violation.id}: ${violation.description}`
      )
      console.log(`   Affected elements: ${violation.nodes.length}`)
    })

    console.log('==========================\n')

    fs.writeFileSync(
      'designguard-results.json',
      JSON.stringify(
        {
          targetUrl: TARGET_URL,
          violations: results.violations,
        },
        null,
        2
      )
    )

    console.log('Results saved: designguard-results.json')
  } catch (error) {
    console.error('DesignGuard run failed:', error)
  } finally {
    if (context) {
      await context.close()
    }

    if (browser) {
      await browser.close()
    }
  }
}

main()
import { Daytona } from '@daytona/sdk'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'

const REPO_URL = 'https://github.com/heroku/node-js-getting-started.git'
const APP_PORT = 5000

async function main() {
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY })
  let sandbox

  try {
    console.log('[1/7] Creating sandbox...')
    sandbox = await daytona.create({
      snapshot: 'daytona-medium',
      ephemeral: false,
      autoStopInterval: 10,
    })

    console.log(`Sandbox created: ${sandbox.id}`)
    console.log(`View it live at: https://app.daytona.io/dashboard/sandboxes`)

    console.log('[2/7] Cloning repo...')
    await sandbox.process.executeCommand(`git clone ${REPO_URL} /tmp/app`)

    console.log('[3/7] Installing dependencies...')
    await sandbox.process.executeCommand('npm install', '/tmp/app')

    console.log('[4/7] Starting the app in a background session...')
    const sessionId = 'app-session'

    await sandbox.process.createSession(sessionId)

    const startResult = await sandbox.process.executeSessionCommand(sessionId, {
      command: 'cd /tmp/app && PORT=5000 npm start',
      runAsync: true,
    })

    const cmdId = startResult.cmdId

    console.log('[5/7] Getting preview URL...')
    const preview = await sandbox.getPreviewLink(APP_PORT)

    console.log(`App is live at: ${preview.url}`)
    console.log('>>> Open this URL in your browser now for the demo <<<')

    console.log('[6/7] Waiting for app to be ready...')
    let ready = false

    for (let attempt = 1; attempt <= 6; attempt++) {
      await new Promise((r) => setTimeout(r, 3000))

      try {
        const res = await fetch(preview.url, {
          headers: {
            'x-daytona-preview-token': preview.token,
          },
        })

        if (res.status < 500) {
          ready = true
          console.log(`App responded with status ${res.status} on attempt ${attempt}`)
          break
        }
      } catch {
        console.log(`Attempt ${attempt}: not ready yet...`)
      }
    }

    if (!ready) {
      const logs = await sandbox.process.getSessionCommandLogs(sessionId, cmdId)

      console.log('App never became ready. Server logs:')
      console.log(logs.output)
      return
    }

    console.log('[7/7] Running DesignGuard checks (accessibility + screenshot)...')

    const browser = await chromium.launch()

    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-daytona-preview-token': preview.token,
      },
    })

    const page = await context.newPage()

    await page.goto(preview.url)

    await page.screenshot({
      path: 'designguard-screenshot.png',
      fullPage: true,
    })

    console.log('Screenshot saved: designguard-screenshot.png')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    console.log('\n=== DESIGNGUARD REPORT ===')
    console.log(`Target: ${preview.url}`)
    console.log(`Accessibility violations found: ${results.violations.length}\n`)

    results.violations.forEach((v, i) => {
      console.log(`${i + 1}. [${v.impact}] ${v.id}: ${v.description}`)
      console.log(`   Affected elements: ${v.nodes.length}`)
    })

    console.log('==========================\n')

    // This saves the latest Daytona scan so generate-report.js
    // builds a report with these exact results.
    fs.writeFileSync(
      'designguard-results.json',
      JSON.stringify(
        {
          targetUrl: preview.url,
          violations: results.violations,
        },
        null,
        2
      )
    )

    console.log('Results saved for DesignGuard report.')

    await context.close()
    await browser.close()
  } catch (err) {
    console.error('DesignGuard run failed:', err)
    throw err
  } finally {
    console.log('Sandbox left running for demo — check the Daytona dashboard.')
  }
}

main()
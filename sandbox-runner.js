import { Daytona } from '@daytona/sdk'

const REPO_URL = 'https://github.com/heroku/node-js-getting-started.git'
const APP_PORT = 5000

async function main() {
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY })
  let sandbox

  try {
    console.log('[1/6] Creating sandbox...')
    sandbox = await daytona.create({
      snapshot: 'daytona-medium',
      ephemeral: true,
      autoStopInterval: 10,
    })
    console.log(`Sandbox created: ${sandbox.id}`)

    console.log('[2/6] Cloning repo...')
    await sandbox.process.executeCommand(`git clone ${REPO_URL} /tmp/app`)

    console.log('[3/6] Installing dependencies...')
    const install = await sandbox.process.executeCommand('npm install', '/tmp/app')
    console.log(install.result)

    console.log('[4/6] Starting the app in a background session...')
    const sessionId = 'app-session'
    await sandbox.process.createSession(sessionId)
    const startResult = await sandbox.process.executeSessionCommand(sessionId, {
      command: 'cd /tmp/app && PORT=5000 npm start',
      runAsync: true,
    })
    const cmdId = startResult.cmdId
    console.log(`Server command started, cmdId: ${cmdId}`)

    console.log('[5/6] Getting preview URL...')
    const preview = await sandbox.getPreviewLink(APP_PORT)
    console.log(`App is live at: ${preview.url}`)
    console.log(`Preview token: ${preview.token}`)

    console.log('[6/6] Verifying the app responds (with retries)...')
    let res
    let lastError
    for (let attempt = 1; attempt <= 6; attempt++) {
      await new Promise((r) => setTimeout(r, 3000)) // wait 3s between tries
      try {
        res = await fetch(preview.url, {
          headers: { 'x-daytona-preview-token': preview.token },
        })
        console.log(`Attempt ${attempt}: status ${res.status}`)
        if (res.status < 500) break // 200s, 300s, even 404 mean server IS responding
      } catch (err) {
        lastError = err
        console.log(`Attempt ${attempt}: fetch failed - ${err.message}`)
      }
    }

    if (!res || res.status >= 500) {
      console.log('Server did not respond successfully. Fetching session logs for debugging...')
      const logs = await sandbox.process.getSessionCommandLogs(sessionId, cmdId)
      console.log('--- SESSION LOGS ---')
      console.log(logs.output)
      console.log('--- END LOGS ---')
    }

    return { sandboxId: sandbox.id, previewUrl: preview.url, token: preview.token }
  } catch (err) {
    console.error('Sandbox runner failed:', err)
    throw err
  } finally {
    if (sandbox) {
      console.log('Cleaning up sandbox...')
      await sandbox.delete()
      console.log('Sandbox deleted.')
    }
  }
}

main()

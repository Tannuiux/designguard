import { Daytona } from '@daytona/sdk'

const daytona = new Daytona({ apiKey: 'dtn_207589dcd909634b6b2f9353a90e06aa21b22f6ae9829c5e890e261909128a8c' })

const sandbox = await daytona.create()

const response = await sandbox.process.codeRun('print("Hello World")')
console.log(response.result)

import { Daytona } from '@daytona/sdk'

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY })
const sandbox = await daytona.get('0f28d7ce-7547-4c67-afdd-53da61b9887d')
const preview = await sandbox.getPreviewLink(5000)
console.log(preview.url)
console.log(preview.token)
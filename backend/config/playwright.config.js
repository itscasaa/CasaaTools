import { limitsConfig } from './limits.config.js'

export const playwrightConfig = {
  launchOptions: {
    headless: true,
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  },
  contextOptions: {
    viewport: {
      width: 1440,
      height: 1200
    }
  },
  navigation: {
    waitUntil: 'networkidle',
    timeout: limitsConfig.MAX_PAGE_TIMEOUT
  }
}

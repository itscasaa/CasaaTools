import { customAlphabet } from 'nanoid'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const generate = customAlphabet(alphabet, 10)

/**
 * Generates a unique scan ID in the format: scan-{10 alphanumeric chars}
 */
export const generateScanId = () => {
  return `scan-${generate()}`
}

import { nanoid } from 'nanoid'

/**
 * Generates a unique job ID.
 * @returns {string} Job ID
 */
export const generateJobId = () => {
  return `pm-job-${nanoid(10)}`
}

import { describe, it, expect } from 'vitest'
import { generateLighthouseDemo, generateCodeqlDemo } from '../../services/demo.service.js'

describe('demo.service', () => {
  describe('generateLighthouseDemo()', () => {
    it('returns an object with scores, coreWebVitals, opportunities, diagnostics, recommendations, and files', () => {
      const result = generateLighthouseDemo()

      expect(result).toHaveProperty('scores')
      expect(result).toHaveProperty('coreWebVitals')
      expect(result).toHaveProperty('opportunities')
      expect(result).toHaveProperty('diagnostics')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('files')
    })

    it('has scores as integers between 0 and 100 for all four categories', () => {
      const { scores } = generateLighthouseDemo()

      expect(scores).toHaveProperty('performance')
      expect(scores).toHaveProperty('accessibility')
      expect(scores).toHaveProperty('bestPractices')
      expect(scores).toHaveProperty('seo')

      for (const [key, value] of Object.entries(scores)) {
        expect(Number.isInteger(value), `${key} should be integer`).toBe(true)
        expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0)
        expect(value, `${key} should be <= 100`).toBeLessThanOrEqual(100)
      }
    })

    it('has varied scores (not all perfect 100)', () => {
      const { scores } = generateLighthouseDemo()
      const values = Object.values(scores)
      const allPerfect = values.every(v => v === 100)
      expect(allPerfect).toBe(false)
    })

    it('has Core Web Vitals with correct metric types', () => {
      const { coreWebVitals } = generateLighthouseDemo()

      expect(coreWebVitals).toHaveProperty('fcp')
      expect(coreWebVitals).toHaveProperty('lcp')
      expect(coreWebVitals).toHaveProperty('tbt')
      expect(coreWebVitals).toHaveProperty('cls')
      expect(coreWebVitals).toHaveProperty('speedIndex')

      // FCP, LCP, TBT, speedIndex should be positive numbers (ms)
      expect(coreWebVitals.fcp).toBeGreaterThan(0)
      expect(coreWebVitals.lcp).toBeGreaterThan(0)
      expect(coreWebVitals.tbt).toBeGreaterThan(0)
      expect(coreWebVitals.speedIndex).toBeGreaterThan(0)

      // CLS should be a decimal >= 0
      expect(coreWebVitals.cls).toBeGreaterThanOrEqual(0)
      expect(coreWebVitals.cls).toBeLessThan(1)
    })

    it('has at least 5 opportunities', () => {
      const { opportunities } = generateLighthouseDemo()
      expect(opportunities.length).toBeGreaterThanOrEqual(5)
    })

    it('has opportunities with correct shape (id, title, description, estimatedSavingsMs)', () => {
      const { opportunities } = generateLighthouseDemo()

      for (const item of opportunities) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('estimatedSavingsMs')
        expect(typeof item.id).toBe('string')
        expect(typeof item.title).toBe('string')
        expect(typeof item.description).toBe('string')
        expect(typeof item.estimatedSavingsMs).toBe('number')
        expect(item.estimatedSavingsMs).toBeGreaterThan(0)
      }
    })

    it('has at least 3 diagnostics', () => {
      const { diagnostics } = generateLighthouseDemo()
      expect(diagnostics.length).toBeGreaterThanOrEqual(3)
    })

    it('has diagnostics with correct shape (id, title, description, details)', () => {
      const { diagnostics } = generateLighthouseDemo()

      for (const item of diagnostics) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('details')
        expect(typeof item.id).toBe('string')
        expect(typeof item.title).toBe('string')
        expect(typeof item.description).toBe('string')
        expect(typeof item.details).toBe('string')
      }
    })

    it('has files object with expected keys', () => {
      const { files } = generateLighthouseDemo()

      expect(files.result).toBe('lighthouse-result.json')
      expect(files.summary).toBe('summary.json')
      expect(files.report).toBe('lighthouse-report.html')
    })

    it('is deterministic (returns same output every call)', () => {
      const result1 = generateLighthouseDemo()
      const result2 = generateLighthouseDemo()
      expect(result1).toEqual(result2)
    })
  })

  describe('generateCodeqlDemo()', () => {
    it('returns an object with summary, findings, and files', () => {
      const result = generateCodeqlDemo()

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('findings')
      expect(result).toHaveProperty('files')
    })

    it('has summary with total count and bySeverity breakdown', () => {
      const { summary } = generateCodeqlDemo()

      expect(summary).toHaveProperty('total')
      expect(summary).toHaveProperty('bySeverity')
      expect(summary.bySeverity).toHaveProperty('critical')
      expect(summary.bySeverity).toHaveProperty('high')
      expect(summary.bySeverity).toHaveProperty('medium')
      expect(summary.bySeverity).toHaveProperty('low')
      expect(summary.bySeverity).toHaveProperty('info')
    })

    it('has at least 5 findings', () => {
      const { findings } = generateCodeqlDemo()
      expect(findings.length).toBeGreaterThanOrEqual(5)
    })

    it('has summary.total equal to the number of findings', () => {
      const { summary, findings } = generateCodeqlDemo()
      expect(summary.total).toBe(findings.length)
    })

    it('covers severity levels: critical, high, medium, and low', () => {
      const { summary } = generateCodeqlDemo()

      expect(summary.bySeverity.critical).toBeGreaterThanOrEqual(1)
      expect(summary.bySeverity.high).toBeGreaterThanOrEqual(1)
      expect(summary.bySeverity.medium).toBeGreaterThanOrEqual(1)
      expect(summary.bySeverity.low).toBeGreaterThanOrEqual(1)
    })

    it('has bySeverity counts that sum to total', () => {
      const { summary } = generateCodeqlDemo()
      const summed = Object.values(summary.bySeverity).reduce((a, b) => a + b, 0)
      expect(summed).toBe(summary.total)
    })

    it('has findings with correct shape (ruleId, title, severity, filePath, line, message, recommendation)', () => {
      const { findings } = generateCodeqlDemo()

      for (const finding of findings) {
        expect(finding).toHaveProperty('ruleId')
        expect(finding).toHaveProperty('title')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('filePath')
        expect(finding).toHaveProperty('line')
        expect(finding).toHaveProperty('message')
        expect(finding).toHaveProperty('recommendation')

        expect(typeof finding.ruleId).toBe('string')
        expect(typeof finding.title).toBe('string')
        expect(typeof finding.severity).toBe('string')
        expect(typeof finding.filePath).toBe('string')
        expect(typeof finding.line).toBe('number')
        expect(typeof finding.message).toBe('string')
        expect(finding.line).toBeGreaterThan(0)
      }
    })

    it('has no absolute paths in filePath (no leading / or \\ or drive letter)', () => {
      const { findings } = generateCodeqlDemo()

      for (const finding of findings) {
        // Should not start with / or \
        expect(finding.filePath).not.toMatch(/^[/\\]/)
        // Should not start with drive letter (e.g. C:\)
        expect(finding.filePath).not.toMatch(/^[A-Za-z]:[/\\]/)
        // Should not contain .. sequences
        expect(finding.filePath).not.toContain('..')
      }
    })

    it('has files object with expected keys', () => {
      const { files } = generateCodeqlDemo()

      expect(files.sarif).toBe('codeql-results.sarif')
      expect(files.findings).toBe('findings.json')
    })

    it('is deterministic (returns same output every call)', () => {
      const result1 = generateCodeqlDemo()
      const result2 = generateCodeqlDemo()
      expect(result1).toEqual(result2)
    })
  })
})

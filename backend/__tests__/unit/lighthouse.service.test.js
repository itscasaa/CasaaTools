import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock chrome-launcher
vi.mock('chrome-launcher', () => ({
  launch: vi.fn(),
  Launcher: { getFirstInstallation: vi.fn() }
}))

// Mock lighthouse
vi.mock('lighthouse', () => ({ default: vi.fn() }))

// Mock fs/promises for writeOutputFiles
vi.mock('fs/promises', () => ({
  default: { mkdir: vi.fn().mockResolvedValue(undefined), writeFile: vi.fn().mockResolvedValue(undefined) }
}))

// Mock logger to suppress output in tests
vi.mock('../../utils/logger.util.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}))

import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { scannerConfig } from '../../config/scanner.config.js'
import {
  detectChrome,
  extractScores,
  extractCoreWebVitals,
  extractOpportunities,
  extractDiagnostics,
  extractDetailedOpportunities,
  extractDetailedDiagnostics,
  formatBytes,
  formatMs,
  runLighthouseScan
} from '../../services/lighthouse.service.js'

// Sample mock LHR for tests
const mockLhr = {
  categories: {
    performance: { score: 0.72 },
    accessibility: { score: 0.88 },
    'best-practices': { score: 0.92 },
    seo: { score: 0.85 }
  },
  audits: {
    'first-contentful-paint': { numericValue: 1800 },
    'largest-contentful-paint': { numericValue: 3200 },
    'total-blocking-time': { numericValue: 280 },
    'cumulative-layout-shift': { numericValue: 0.12 },
    'speed-index': { numericValue: 3800 },
    'render-blocking-resources': {
      title: 'Eliminate render-blocking resources',
      description: 'Resources are blocking paint',
      details: { overallSavingsMs: 1500 }
    },
    'unused-css-rules': {
      title: 'Remove unused CSS',
      description: 'Unused CSS rules',
      details: { overallSavingsMs: 800 }
    },
    'dom-size': {
      title: 'Avoid excessive DOM size',
      description: 'Large DOM increases memory',
      score: 0.5,
      displayValue: '1500 elements'
    }
  }
}

// Mock LHR with table details for detailed extraction tests
const mockLhrWithTables = {
  categories: {
    performance: {
      score: 0.72,
      auditRefs: [
        { id: 'unused-javascript', group: 'load-opportunities' },
        { id: 'dom-size', group: 'diagnostics' }
      ]
    },
    accessibility: { score: 0.88 },
    'best-practices': { score: 0.92 },
    seo: { score: 0.85 }
  },
  audits: {
    'unused-javascript': {
      id: 'unused-javascript',
      title: 'Reduce unused JavaScript',
      description: 'Reduce unused JavaScript and defer...',
      score: 0.5,
      displayValue: 'Potential savings of 28 KiB',
      numericValue: 500,
      metricSavings: { LCP: 500, FCP: 200 },
      details: {
        type: 'opportunity',
        overallSavingsMs: 500,
        overallSavingsBytes: 28672,
        headings: [
          { key: 'url', valueType: 'url', label: 'URL' },
          { key: 'transferSize', valueType: 'bytes', label: 'Transfer Size' },
          { key: 'wastedBytes', valueType: 'bytes', label: 'Potential Savings' }
        ],
        items: [
          {
            url: 'https://example.com/assets/bundle.js',
            transferSize: 30208,
            wastedBytes: 28672
          },
          {
            url: 'https://cdn.example.com/lib/react.min.js',
            transferSize: 45056,
            wastedBytes: 12288
          }
        ]
      }
    },
    'dom-size': {
      id: 'dom-size',
      title: 'Avoid an excessive DOM size',
      description: 'A large DOM will increase memory...',
      score: 0.5,
      displayValue: '1,500 elements',
      details: {
        type: 'table',
        headings: [
          { key: 'statistic', label: 'Statistic' },
          { key: 'value', label: 'Value' }
        ],
        items: [
          { statistic: 'Total DOM Elements', value: '1,500' },
          { statistic: 'Maximum DOM Depth', value: '15' }
        ]
      }
    },
    'first-contentful-paint': { numericValue: 1800 },
    'largest-contentful-paint': { numericValue: 3200 },
    'total-blocking-time': { numericValue: 280 },
    'cumulative-layout-shift': { numericValue: 0.12 },
    'speed-index': { numericValue: 3800 }
  }
}

describe('lighthouse.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectChrome', () => {
    it('should return available=true when SCANNER_CHROME_PATH is set', () => {
      const originalPath = scannerConfig.CHROME_PATH
      scannerConfig.CHROME_PATH = '/usr/bin/google-chrome'

      const result = detectChrome()

      expect(result.available).toBe(true)
      expect(result.chromePath).toBe('/usr/bin/google-chrome')
      expect(result.error).toBeUndefined()

      scannerConfig.CHROME_PATH = originalPath
    })

    it('should return available=true when chrome-launcher finds Chrome', () => {
      const originalPath = scannerConfig.CHROME_PATH
      scannerConfig.CHROME_PATH = null

      chromeLauncher.Launcher.getFirstInstallation.mockReturnValue('C:\\Program Files\\Google\\Chrome\\chrome.exe')

      const result = detectChrome()

      expect(result.available).toBe(true)
      expect(result.chromePath).toBe('C:\\Program Files\\Google\\Chrome\\chrome.exe')

      scannerConfig.CHROME_PATH = originalPath
    })

    it('should return available=false with Indonesian error when Chrome not found', () => {
      const originalPath = scannerConfig.CHROME_PATH
      scannerConfig.CHROME_PATH = null

      chromeLauncher.Launcher.getFirstInstallation.mockReturnValue(null)

      const result = detectChrome()

      expect(result.available).toBe(false)
      expect(result.error).toContain('Chrome/Chromium tidak ditemukan')

      scannerConfig.CHROME_PATH = originalPath
    })
  })

  describe('extractScores', () => {
    it('should extract scores as integers 0-100 from LHR categories', () => {
      const scores = extractScores(mockLhr)

      expect(scores.performance).toBe(72)
      expect(scores.accessibility).toBe(88)
      expect(scores.bestPractices).toBe(92)
      expect(scores.seo).toBe(85)
    })

    it('should handle missing categories gracefully (returns 0)', () => {
      const lhr = { categories: {} }
      const scores = extractScores(lhr)

      expect(scores.performance).toBe(0)
      expect(scores.accessibility).toBe(0)
      expect(scores.bestPractices).toBe(0)
      expect(scores.seo).toBe(0)
    })

    it('should round score correctly (0.85 → 85)', () => {
      const lhr = {
        categories: {
          performance: { score: 0.85 },
          accessibility: { score: 0.999 },
          'best-practices': { score: 0.001 },
          seo: { score: 0.5 }
        }
      }
      const scores = extractScores(lhr)

      expect(scores.performance).toBe(85)
      expect(scores.accessibility).toBe(100)
      expect(scores.bestPractices).toBe(0)
      expect(scores.seo).toBe(50)
    })
  })

  describe('extractCoreWebVitals', () => {
    it('should extract correct metric values', () => {
      const vitals = extractCoreWebVitals(mockLhr)

      expect(vitals.fcp).toBe(1800)
      expect(vitals.lcp).toBe(3200)
      expect(vitals.tbt).toBe(280)
      expect(vitals.cls).toBe(0.12)
      expect(vitals.speedIndex).toBe(3800)
    })

    it('should handle missing audits (returns 0)', () => {
      const lhr = { audits: {} }
      const vitals = extractCoreWebVitals(lhr)

      expect(vitals.fcp).toBe(0)
      expect(vitals.lcp).toBe(0)
      expect(vitals.tbt).toBe(0)
      expect(vitals.cls).toBe(0)
      expect(vitals.speedIndex).toBe(0)
    })

    it('should return CLS as decimal and others as integers', () => {
      const lhr = {
        audits: {
          'first-contentful-paint': { numericValue: 1234.56 },
          'largest-contentful-paint': { numericValue: 2500.7 },
          'total-blocking-time': { numericValue: 150.3 },
          'cumulative-layout-shift': { numericValue: 0.0567 },
          'speed-index': { numericValue: 4200.9 }
        }
      }
      const vitals = extractCoreWebVitals(lhr)

      expect(vitals.fcp).toBe(1235) // rounded integer
      expect(vitals.lcp).toBe(2501) // rounded integer
      expect(vitals.tbt).toBe(150) // rounded integer
      expect(vitals.cls).toBe(0.0567) // decimal preserved
      expect(vitals.speedIndex).toBe(4201) // rounded integer
    })
  })

  describe('extractOpportunities', () => {
    it('should extract and sort by savings descending', () => {
      const opps = extractOpportunities(mockLhr)

      expect(opps.length).toBe(2)
      expect(opps[0].id).toBe('render-blocking-resources')
      expect(opps[0].estimatedSavingsMs).toBe(1500)
      expect(opps[1].id).toBe('unused-css-rules')
      expect(opps[1].estimatedSavingsMs).toBe(800)
    })

    it('should cap at max limit (default 20)', () => {
      // Create LHR with more than 20 opportunities
      const audits = {}
      for (let i = 0; i < 25; i++) {
        audits[`audit-${i}`] = {
          title: `Audit ${i}`,
          description: `Description ${i}`,
          details: { overallSavingsMs: 100 + i }
        }
      }
      const lhr = { audits }

      const opps = extractOpportunities(lhr)
      expect(opps.length).toBe(20)
    })

    it('should ignore audits without savings', () => {
      const lhr = {
        audits: {
          'has-savings': {
            title: 'Has savings',
            description: 'Something',
            details: { overallSavingsMs: 500 }
          },
          'no-savings': {
            title: 'No savings',
            description: 'Nothing',
            details: {}
          },
          'zero-savings': {
            title: 'Zero savings',
            description: 'Zero',
            details: { overallSavingsMs: 0 }
          },
          'no-details': {
            title: 'No details',
            description: 'No details at all'
          }
        }
      }

      const opps = extractOpportunities(lhr)
      expect(opps.length).toBe(1)
      expect(opps[0].id).toBe('has-savings')
    })
  })

  describe('extractDiagnostics', () => {
    it('should extract failed diagnostic audits', () => {
      const lhr = {
        categories: {
          performance: {
            auditRefs: [
              { id: 'dom-size', group: 'diagnostics' },
              { id: 'some-other', group: 'diagnostics' }
            ]
          }
        },
        audits: {
          'dom-size': {
            title: 'Avoid excessive DOM size',
            description: 'Large DOM increases memory',
            score: 0.5,
            displayValue: '1500 elements'
          },
          'some-other': {
            title: 'Some other diagnostic',
            description: 'Some description',
            score: 0.3,
            displayValue: 'some value'
          }
        }
      }

      const diags = extractDiagnostics(lhr)
      expect(diags.length).toBe(2)
      expect(diags[0].id).toBe('dom-size')
      expect(diags[0].title).toBe('Avoid excessive DOM size')
      expect(diags[0].details).toBe('1500 elements')
    })

    it('should cap at max limit', () => {
      const auditRefs = []
      const audits = {}
      for (let i = 0; i < 25; i++) {
        auditRefs.push({ id: `diag-${i}`, group: 'diagnostics' })
        audits[`diag-${i}`] = {
          title: `Diagnostic ${i}`,
          description: `Desc ${i}`,
          score: 0.5,
          displayValue: `value ${i}`
        }
      }
      const lhr = {
        categories: { performance: { auditRefs } },
        audits
      }

      const diags = extractDiagnostics(lhr)
      expect(diags.length).toBe(20) // default MAX_DIAGNOSTICS
    })
  })

  describe('formatBytes', () => {
    it('should return "0 B" for 0, undefined, null', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(undefined)).toBe('0 B')
      expect(formatBytes(null)).toBe('0 B')
    })

    it('should format bytes less than 1024 as B', () => {
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1)).toBe('1 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('should format bytes as KiB', () => {
      expect(formatBytes(1024)).toBe('1.0 KiB')
      expect(formatBytes(28672)).toBe('28.0 KiB')
      expect(formatBytes(30208)).toBe('29.5 KiB')
    })

    it('should format bytes as MiB', () => {
      expect(formatBytes(1048576)).toBe('1.0 MiB')
      expect(formatBytes(5242880)).toBe('5.0 MiB')
    })
  })

  describe('formatMs', () => {
    it('should return "0 ms" for 0, undefined, null', () => {
      expect(formatMs(0)).toBe('0 ms')
      expect(formatMs(undefined)).toBe('0 ms')
      expect(formatMs(null)).toBe('0 ms')
    })

    it('should format milliseconds less than 1000 as ms', () => {
      expect(formatMs(500)).toBe('500 ms')
      expect(formatMs(999)).toBe('999 ms')
      expect(formatMs(1)).toBe('1 ms')
    })

    it('should format milliseconds >= 1000 as seconds', () => {
      expect(formatMs(1000)).toBe('1.0 s')
      expect(formatMs(1500)).toBe('1.5 s')
      expect(formatMs(3200)).toBe('3.2 s')
    })
  })

  describe('extractDetailedOpportunities', () => {
    it('should extract table data with headings and items', () => {
      const opps = extractDetailedOpportunities(mockLhrWithTables)

      expect(opps.length).toBeGreaterThan(0)
      const jsOpp = opps.find(o => o.id === 'unused-javascript')
      expect(jsOpp).toBeDefined()
      expect(jsOpp.title).toBe('Reduce unused JavaScript')
      expect(jsOpp.displayValue).toBe('Potential savings of 28 KiB')

      // Table headings
      expect(jsOpp.table.headings).toHaveLength(3)
      expect(jsOpp.table.headings[0]).toEqual({ key: 'url', label: 'URL' })
      expect(jsOpp.table.headings[1]).toEqual({ key: 'transferSize', label: 'Ukuran Transfer' })
      expect(jsOpp.table.headings[2]).toEqual({ key: 'wastedBytes', label: 'Perkiraan Penghematan' })

      // Table items
      expect(jsOpp.table.items).toHaveLength(2)
      expect(jsOpp.table.items[0].url).toBe('https://example.com/assets/bundle.js')
      expect(jsOpp.table.items[0].displayUrl).toBe('/assets/bundle.js')
      expect(jsOpp.table.items[0].origin).toBe('example.com')
      expect(jsOpp.table.items[0].transferSize).toBe(30208)
      expect(jsOpp.table.items[0].wastedBytes).toBe(28672)
    })

    it('should format bytes correctly in table items', () => {
      const opps = extractDetailedOpportunities(mockLhrWithTables)
      const jsOpp = opps.find(o => o.id === 'unused-javascript')

      expect(jsOpp.table.items[0].transferSizeFormatted).toBe('29.5 KiB')
      expect(jsOpp.table.items[0].wastedBytesFormatted).toBe('28.0 KiB')
      expect(jsOpp.table.items[1].transferSizeFormatted).toBe('44.0 KiB')
      expect(jsOpp.table.items[1].wastedBytesFormatted).toBe('12.0 KiB')
    })

    it('should extract badges from metricSavings', () => {
      const opps = extractDetailedOpportunities(mockLhrWithTables)
      const jsOpp = opps.find(o => o.id === 'unused-javascript')

      expect(jsOpp.badges).toContain('LCP')
      expect(jsOpp.badges).toContain('FCP')
      expect(jsOpp.badges).toHaveLength(2)
    })

    it('should include savings info', () => {
      const opps = extractDetailedOpportunities(mockLhrWithTables)
      const jsOpp = opps.find(o => o.id === 'unused-javascript')

      expect(jsOpp.savings.bytes).toBe(28672)
      expect(jsOpp.savings.ms).toBe(500)
      expect(jsOpp.savings.formatted).toBe('28.0 KiB')
    })
  })

  describe('extractDetailedDiagnostics', () => {
    it('should extract table data for diagnostic audits', () => {
      const diags = extractDetailedDiagnostics(mockLhrWithTables)

      expect(diags.length).toBe(1)
      expect(diags[0].id).toBe('dom-size')
      expect(diags[0].title).toBe('Avoid an excessive DOM size')
      expect(diags[0].displayValue).toBe('1,500 elements')

      // Table headings
      expect(diags[0].table.headings).toHaveLength(2)
      expect(diags[0].table.headings[0]).toEqual({ key: 'statistic', label: 'Statistik' })
      expect(diags[0].table.headings[1]).toEqual({ key: 'value', label: 'Nilai' })

      // Table items
      expect(diags[0].table.items).toHaveLength(2)
      expect(diags[0].table.items[0].statistic).toBe('Total DOM Elements')
      expect(diags[0].table.items[0].value).toBe('1,500')
      expect(diags[0].table.items[1].statistic).toBe('Maximum DOM Depth')
      expect(diags[0].table.items[1].value).toBe('15')
    })
  })

  describe('runLighthouseScan - multi-run', () => {
    it('should run lighthouse multiple times (mock 3 calls)', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 3

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockResolvedValue({
        lhr: mockLhrWithTables,
        report: ['{}', '<html>report</html>']
      })

      const result = await runLighthouseScan({
        scanId: 'scan-multi01',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-multi01'
      })

      // Should have launched Chrome 3 times
      expect(chromeLauncher.launch).toHaveBeenCalledTimes(3)
      // Should have killed Chrome 3 times
      expect(mockChrome.kill).toHaveBeenCalledTimes(3)
      // Should have called lighthouse 3 times
      expect(lighthouse).toHaveBeenCalledTimes(3)

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should select median score', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 3

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      // Return different performance scores: 60, 80, 70 → median is 70
      const lhr60 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.60 } } }
      const lhr80 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.80 } } }
      const lhr70 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.70 } } }

      lighthouse
        .mockResolvedValueOnce({ lhr: lhr60, report: ['{}', '<html></html>'] })
        .mockResolvedValueOnce({ lhr: lhr80, report: ['{}', '<html></html>'] })
        .mockResolvedValueOnce({ lhr: lhr70, report: ['{}', '<html></html>'] })

      const result = await runLighthouseScan({
        scanId: 'scan-median01',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-median01'
      })

      // Median of [60, 80, 70] sorted = [60, 70, 80], median index = 1 → 70
      expect(result.scores.performance).toBe(70)
      expect(result.stability.selectedScore).toBe(70)
      expect(result.stability.performanceScores).toEqual([60, 80, 70])

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should handle one failed run gracefully', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 3

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      // First run succeeds, second fails, third succeeds
      lighthouse
        .mockResolvedValueOnce({ lhr: mockLhrWithTables, report: ['{}', '<html></html>'] })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ lhr: mockLhrWithTables, report: ['{}', '<html></html>'] })

      const result = await runLighthouseScan({
        scanId: 'scan-partial01',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-partial01'
      })

      // Should succeed with 2 successful runs
      expect(result.stability.runCount).toBe(2)
      expect(result.stability.warnings).toHaveLength(1)
      expect(result.stability.warnings[0]).toContain('Run 2 failed')

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should report stability info', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 3

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      const lhr65 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.65 } } }
      const lhr75 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.75 } } }
      const lhr70 = { ...mockLhrWithTables, categories: { ...mockLhrWithTables.categories, performance: { ...mockLhrWithTables.categories.performance, score: 0.70 } } }

      lighthouse
        .mockResolvedValueOnce({ lhr: lhr65, report: ['{}', '<html></html>'] })
        .mockResolvedValueOnce({ lhr: lhr75, report: ['{}', '<html></html>'] })
        .mockResolvedValueOnce({ lhr: lhr70, report: ['{}', '<html></html>'] })

      const result = await runLighthouseScan({
        scanId: 'scan-stability01',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-stability01'
      })

      expect(result.stability).toBeDefined()
      expect(result.stability.runCount).toBe(3)
      expect(result.stability.strategy).toBe('median')
      expect(result.stability.performanceScores).toEqual([65, 75, 70])
      expect(result.stability.variance).toBe(10) // 75 - 65
      expect(result.stability.warnings).toBeUndefined()

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should throw error when all runs fail', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 3

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockRejectedValue(new Error('Chrome crashed'))

      await expect(
        runLighthouseScan({
          scanId: 'scan-allfail01',
          url: 'https://example.com',
          outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-allfail01'
        })
      ).rejects.toThrow(/Semua 3 run Lighthouse gagal/)

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should include settings in result', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 1

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockResolvedValue({
        lhr: mockLhrWithTables,
        report: ['{}', '<html></html>']
      })

      const result = await runLighthouseScan({
        scanId: 'scan-settings01',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-settings01'
      })

      expect(result.settings).toBeDefined()
      expect(result.settings.formFactor).toBe(scannerConfig.LIGHTHOUSE_FORM_FACTOR)
      expect(result.settings.throttling).toBe(scannerConfig.LIGHTHOUSE_THROTTLING)
      expect(result.files).toHaveProperty('result', 'lighthouse-result.json')
      expect(result.files).toHaveProperty('summary', 'summary.json')
      expect(result.files).toHaveProperty('report', 'lighthouse-report.html')

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })
  })

  describe('runLighthouseScan - legacy', () => {
    it('should call Chrome launch + lighthouse audit + writes files + returns result shape', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 1

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockResolvedValue({
        lhr: mockLhrWithTables,
        report: ['{}', '<html>report</html>']
      })

      const result = await runLighthouseScan({
        scanId: 'scan-test12345',
        url: 'https://example.com',
        outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-test12345'
      })

      // Verify Chrome was launched
      expect(chromeLauncher.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
        })
      )

      // Verify lighthouse was called with correct port
      expect(lighthouse).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ port: 9222 }),
        expect.any(Object)
      )

      // Verify Chrome was killed
      expect(mockChrome.kill).toHaveBeenCalled()

      // Verify result shape
      expect(result).toHaveProperty('scores')
      expect(result).toHaveProperty('coreWebVitals')
      expect(result).toHaveProperty('opportunities')
      expect(result).toHaveProperty('diagnostics')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('stability')
      expect(result).toHaveProperty('settings')
      expect(result).toHaveProperty('files')
      expect(result.files).toHaveProperty('result', 'lighthouse-result.json')
      expect(result.files).toHaveProperty('summary', 'summary.json')
      expect(result.files).toHaveProperty('report', 'lighthouse-report.html')

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should always kill Chrome even on error', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 1

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockRejectedValue(new Error('Audit failed'))

      await expect(
        runLighthouseScan({
          scanId: 'scan-err123456',
          url: 'https://example.com',
          outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-err123456'
        })
      ).rejects.toThrow(/Semua 1 run Lighthouse gagal/)

      // Chrome should still be killed even after error
      expect(mockChrome.kill).toHaveBeenCalled()

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should throw TIMEOUT error when audit exceeds time limit', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 1

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      // Simulate a slow audit that never resolves within timeout
      lighthouse.mockImplementation(() => new Promise((resolve) => {
        // This will never resolve before the timeout
        setTimeout(resolve, 999999)
      }))

      // Temporarily set a very short timeout for test
      const originalTimeout = scannerConfig.LIGHTHOUSE_TIMEOUT_MS
      scannerConfig.LIGHTHOUSE_TIMEOUT_MS = 50

      await expect(
        runLighthouseScan({
          scanId: 'scan-timeout01',
          url: 'https://example.com',
          outputDir: scannerConfig.SCAN_OUTPUT_DIR + '/scan-timeout01'
        })
      ).rejects.toThrow()

      expect(mockChrome.kill).toHaveBeenCalled()

      scannerConfig.LIGHTHOUSE_TIMEOUT_MS = originalTimeout
      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })
  })

  describe('No absolute path in output', () => {
    it('should validate output paths with isContainedIn', async () => {
      const originalRuns = scannerConfig.LIGHTHOUSE_RUNS
      scannerConfig.LIGHTHOUSE_RUNS = 1

      const mockChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) }
      chromeLauncher.launch.mockResolvedValue(mockChrome)

      lighthouse.mockResolvedValue({
        lhr: mockLhrWithTables,
        report: ['{}', '<html></html>']
      })

      // Use a path that is OUTSIDE the allowed base directory
      await expect(
        runLighthouseScan({
          scanId: 'scan-pathcheck',
          url: 'https://example.com',
          outputDir: '/etc/evil-directory'
        })
      ).rejects.toThrow('outside the allowed base directory')

      expect(mockChrome.kill).toHaveBeenCalled()

      scannerConfig.LIGHTHOUSE_RUNS = originalRuns
    })

    it('should not include absolute paths in table item URLs', () => {
      const opps = extractDetailedOpportunities(mockLhrWithTables)
      const jsOpp = opps.find(o => o.id === 'unused-javascript')

      for (const item of jsOpp.table.items) {
        // displayUrl should be path-only, not absolute filesystem path
        expect(item.displayUrl).not.toMatch(/^[A-Za-z]:[/\\]/)
        expect(item.displayUrl).not.toMatch(/^\/etc\//)
      }
    })
  })
})

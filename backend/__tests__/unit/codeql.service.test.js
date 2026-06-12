import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

// Mock scanner config
vi.mock('../../config/scanner.config.js', () => ({
  scannerConfig: {
    CODEQL_PATH: null,
    CODEQL_LANGUAGE: 'javascript-typescript',
    CODEQL_TIMEOUT_MS: 600000,
    CODEQL_QUERY_SUITE: 'javascript-security-extended'
  }
}))

// Mock logger
vi.mock('../../utils/logger.util.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

import { spawn } from 'child_process'
import { detectCodeql, createDatabase, analyzeDatabase, parseSarif } from '../../services/codeql.service.js'
import { scannerConfig } from '../../config/scanner.config.js'

describe('codeql.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectCodeql()', () => {
    it('returns available: false when CODEQL_PATH is not set', () => {
      const result = detectCodeql()
      expect(result.available).toBe(false)
      expect(result.error).toContain('CodeQL CLI tidak ditemukan')
    })

    it('returns available: true when CODEQL_PATH is set', () => {
      scannerConfig.CODEQL_PATH = '/usr/local/bin/codeql'
      const result = detectCodeql()
      expect(result.available).toBe(true)
      expect(result.binaryPath).toBe('/usr/local/bin/codeql')
      scannerConfig.CODEQL_PATH = null // reset
    })
  })

  describe('createDatabase()', () => {
    it('spawns codeql with correct arguments', async () => {
      const mockChild = createMockProcess(0)
      spawn.mockReturnValue(mockChild)

      scannerConfig.CODEQL_PATH = '/usr/local/bin/codeql'
      const promise = createDatabase('/source', '/db')

      // Trigger close
      mockChild._emit('close', 0)
      const result = await promise

      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/codeql',
        expect.arrayContaining(['database', 'create', '/db']),
        expect.objectContaining({ shell: false })
      )
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
      scannerConfig.CODEQL_PATH = null
    })

    it('rejects when process exits with non-zero code', async () => {
      const mockChild = createMockProcess(1, 'Error occurred')
      spawn.mockReturnValue(mockChild)

      scannerConfig.CODEQL_PATH = '/usr/local/bin/codeql'
      const promise = createDatabase('/source', '/db')
      mockChild._emit('close', 1)

      await expect(promise).rejects.toThrow()
      scannerConfig.CODEQL_PATH = null
    })

    it('never uses shell: true', async () => {
      const mockChild = createMockProcess(0)
      spawn.mockReturnValue(mockChild)

      scannerConfig.CODEQL_PATH = '/usr/local/bin/codeql'
      const promise = createDatabase('/source', '/db')
      mockChild._emit('close', 0)
      await promise

      expect(spawn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ shell: false })
      )
      scannerConfig.CODEQL_PATH = null
    })
  })

  describe('analyzeDatabase()', () => {
    it('spawns codeql analyze with correct arguments', async () => {
      const mockChild = createMockProcess(0)
      spawn.mockReturnValue(mockChild)

      scannerConfig.CODEQL_PATH = '/usr/local/bin/codeql'
      const promise = analyzeDatabase('/db', '/output/results.sarif')
      mockChild._emit('close', 0)
      const result = await promise

      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/codeql',
        expect.arrayContaining(['database', 'analyze', '/db', '--format=sarif-latest']),
        expect.objectContaining({ shell: false })
      )
      expect(result).toHaveProperty('stdout')
      scannerConfig.CODEQL_PATH = null
    })
  })

  describe('parseSarif()', () => {
    it('extracts findings from valid SARIF content', () => {
      const sarif = {
        runs: [{
          tool: {
            driver: {
              rules: [{
                id: 'js/command-injection',
                name: 'CommandInjection',
                shortDescription: { text: 'Command Injection' }
              }]
            }
          },
          results: [{
            ruleId: 'js/command-injection',
            level: 'error',
            message: { text: 'User input in exec call' },
            locations: [{
              physicalLocation: {
                artifactLocation: { uri: 'src/controllers/deploy.js' },
                region: { startLine: 42 }
              }
            }]
          }]
        }]
      }

      const findings = parseSarif(sarif, '/project')

      expect(findings).toHaveLength(1)
      expect(findings[0].ruleId).toBe('js/command-injection')
      expect(findings[0].severity).toBe('high')
      expect(findings[0].filePath).toBe('src/controllers/deploy.js')
      expect(findings[0].line).toBe(42)
      expect(findings[0].message).toBe('User input in exec call')
    })

    it('maps SARIF severity levels correctly', () => {
      const sarif = {
        runs: [{
          tool: { driver: { rules: [] } },
          results: [
            { ruleId: 'r1', level: 'error', message: { text: 'a' }, locations: [] },
            { ruleId: 'r2', level: 'warning', message: { text: 'b' }, locations: [] },
            { ruleId: 'r3', level: 'note', message: { text: 'c' }, locations: [] },
            { ruleId: 'r4', level: 'none', message: { text: 'd' }, locations: [] }
          ]
        }]
      }

      const findings = parseSarif(sarif, '')

      expect(findings[0].severity).toBe('high')
      expect(findings[1].severity).toBe('medium')
      expect(findings[2].severity).toBe('low')
      expect(findings[3].severity).toBe('info')
    })

    it('returns empty array for null or invalid SARIF', () => {
      expect(parseSarif(null, '')).toEqual([])
      expect(parseSarif({}, '')).toEqual([])
      expect(parseSarif({ runs: [] }, '')).toEqual([])
    })

    it('strips absolute paths from file locations', () => {
      const sarif = {
        runs: [{
          tool: { driver: { rules: [] } },
          results: [{
            ruleId: 'js/xss',
            level: 'warning',
            message: { text: 'XSS' },
            locations: [{
              physicalLocation: {
                artifactLocation: { uri: 'src/app.js' },
                region: { startLine: 10 }
              }
            }]
          }]
        }]
      }

      const findings = parseSarif(sarif, '/project')

      expect(findings[0].filePath).toBe('src/app.js')
      // Should NOT contain absolute path
      expect(findings[0].filePath).not.toMatch(/^\//)
      expect(findings[0].filePath).not.toMatch(/^[A-Za-z]:/)
    })

    it('does not expose absolute paths in findings', () => {
      const sarif = {
        runs: [{
          tool: { driver: { rules: [] } },
          results: [{
            ruleId: 'js/sql-injection',
            level: 'error',
            message: { text: 'SQL injection' },
            locations: [{
              physicalLocation: {
                artifactLocation: { uri: 'src/db.js' },
                region: { startLine: 5 }
              }
            }]
          }]
        }]
      }

      const findings = parseSarif(sarif, '/home/user/project')

      for (const finding of findings) {
        expect(finding.filePath).not.toMatch(/^\//)
        expect(finding.filePath).not.toMatch(/^[A-Za-z]:[/\\]/)
      }
    })
  })
})

/**
 * Helper to create a mock child process.
 */
function createMockProcess(exitCode = 0, stderrOutput = '') {
  const listeners = {}
  const stdoutListeners = {}
  const stderrListeners = {}

  return {
    stdout: {
      on: (event, cb) => { stdoutListeners[event] = cb }
    },
    stderr: {
      on: (event, cb) => {
        stderrListeners[event] = cb
        // Send stderr data if provided
        if (stderrOutput && event === 'data') {
          setTimeout(() => cb(Buffer.from(stderrOutput)), 0)
        }
      }
    },
    on: (event, cb) => { listeners[event] = cb },
    _emit: (event, ...args) => {
      if (listeners[event]) listeners[event](...args)
    }
  }
}

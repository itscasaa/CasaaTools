import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { scannerConfig } from '../config/scanner.config.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'
import { logger } from '../utils/logger.util.js'

/**
 * Detects CodeQL CLI availability.
 * @returns {{ available: boolean, binaryPath?: string, error?: string }}
 */
export function detectCodeql() {
  const binary = getCodeqlBinary()
  if (scannerConfig.CODEQL_PATH) {
    return { available: true, binaryPath: scannerConfig.CODEQL_PATH }
  }
  return {
    available: false,
    error: 'CodeQL CLI tidak ditemukan. Pasang CodeQL CLI atau atur SCANNER_CODEQL_PATH.'
  }
}

/**
 * Returns the CodeQL binary path or name.
 */
function getCodeqlBinary() {
  if (scannerConfig.CODEQL_PATH) return scannerConfig.CODEQL_PATH
  return process.platform === 'win32' ? 'codeql.exe' : 'codeql'
}

/**
 * Creates a CodeQL database from the source directory.
 *
 * @param {string} sourceDir - Path to the source code
 * @param {string} dbDir - Path where the database will be created
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function createDatabase(sourceDir, dbDir) {
  const binary = getCodeqlBinary()
  const args = [
    'database', 'create',
    dbDir,
    '--language=' + scannerConfig.CODEQL_LANGUAGE,
    '--source-root=' + sourceDir,
    '--no-run-unnecessary-builds'
  ]

  return runProcess(binary, args, scannerConfig.CODEQL_TIMEOUT_MS)
}

/**
 * Analyzes a CodeQL database and outputs SARIF.
 *
 * @param {string} dbDir - Path to the CodeQL database
 * @param {string} sarifOutputPath - Path for SARIF output file
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function analyzeDatabase(dbDir, sarifOutputPath) {
  const binary = getCodeqlBinary()
  const args = [
    'database', 'analyze',
    dbDir,
    '--format=sarif-latest',
    '--output=' + sarifOutputPath,
    scannerConfig.CODEQL_QUERY_SUITE
  ]

  return runProcess(binary, args, scannerConfig.CODEQL_TIMEOUT_MS)
}

/**
 * Parses SARIF JSON content into a findings array.
 * Ensures all paths are relative (strips any absolute path prefix).
 *
 * @param {object} sarifContent - Parsed SARIF JSON
 * @param {string} projectRoot - Project root path (to strip from absolute paths)
 * @returns {Array<{ ruleId: string, title: string, severity: string, filePath: string, line: number, message: string, recommendation: null }>}
 */
export function parseSarif(sarifContent, projectRoot) {
  const findings = []

  if (!sarifContent || !sarifContent.runs) return findings

  for (const run of sarifContent.runs) {
    const rules = {}
    if (run.tool?.driver?.rules) {
      for (const rule of run.tool.driver.rules) {
        rules[rule.id] = rule
      }
    }

    if (!run.results) continue

    for (const result of run.results) {
      const ruleId = result.ruleId || 'unknown'
      const rule = rules[ruleId] || {}
      const severity = mapSarifSeverity(result.level)
      const message = result.message?.text || ''

      // Extract location
      let filePath = ''
      let line = 0
      if (result.locations?.[0]?.physicalLocation) {
        const physLoc = result.locations[0].physicalLocation
        const uri = physLoc.artifactLocation?.uri || ''
        filePath = makeRelativePath(uri, projectRoot)
        line = physLoc.region?.startLine || 0
      }

      findings.push({
        ruleId,
        title: rule.shortDescription?.text || rule.name || ruleId,
        severity,
        filePath,
        line,
        message,
        recommendation: null
      })
    }
  }

  return findings
}

/**
 * Maps SARIF level to our severity scale.
 */
function mapSarifSeverity(level) {
  switch (level) {
    case 'error': return 'high'
    case 'warning': return 'medium'
    case 'note': return 'low'
    default: return 'info'
  }
}

/**
 * Converts a URI or absolute path to a relative path.
 */
function makeRelativePath(uri, projectRoot) {
  // Remove file:// prefix if present
  let filePath = uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '')

  // URL decode
  filePath = decodeURIComponent(filePath)

  // Make relative to project root
  if (projectRoot) {
    const normalizedRoot = path.normalize(projectRoot)
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.startsWith(normalizedRoot)) {
      filePath = normalizedPath.slice(normalizedRoot.length)
      // Remove leading separator
      if (filePath.startsWith(path.sep)) {
        filePath = filePath.slice(1)
      }
    }
  }

  // Convert backslashes to forward slashes for consistency
  return filePath.replace(/\\/g, '/')
}

/**
 * Runs a child process safely with timeout.
 * NEVER uses shell: true.
 *
 * @param {string} command - Command to run
 * @param {string[]} args - Arguments array
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function runProcess(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, timeout: timeoutMs })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => { stdout += data.toString() })
    child.stderr?.on('data', (data) => { stderr += data.toString() })

    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(sanitizeErrorMessage(stderr || `Process exited with code ${code}`)))
    })

    child.on('error', (err) => reject(new Error(sanitizeErrorMessage(err.message))))
  })
}

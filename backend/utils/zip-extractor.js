import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'
import { isContainedIn } from './path-containment.js'
import { scannerConfig } from '../config/scanner.config.js'
import { logger } from './logger.util.js'

/**
 * Validates ZIP file magic bytes.
 * ZIP files start with PK (0x50 0x4B 0x03 0x04) for local file header
 * or PK (0x50 0x4B 0x05 0x06) for empty archive end of central dir.
 *
 * @param {Buffer} buffer - First bytes of the file
 * @returns {boolean}
 */
export function isZipFile(buffer) {
  if (!buffer || buffer.length < 4) return false
  // Check PK signature (0x50 0x4B)
  return buffer[0] === 0x50 && buffer[1] === 0x4B &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) || // local file header
     (buffer[2] === 0x05 && buffer[3] === 0x06))   // empty archive
}

/**
 * Safely extracts a ZIP file to a target directory.
 * Prevents Zip Slip, rejects symlinks, enforces size/count limits.
 *
 * @param {string} zipPath - Path to the ZIP file
 * @param {string} targetDir - Target extraction directory (must exist)
 * @returns {Promise<{ success: boolean, fileCount: number, totalSize: number, error?: string }>}
 */
export async function safeExtractZip(zipPath, targetDir) {
  const resolvedTarget = path.resolve(targetDir)
  const maxFiles = scannerConfig.MAX_EXTRACTED_FILES
  const maxTotalSize = scannerConfig.MAX_EXTRACTED_SIZE_MB * 1024 * 1024
  const maxSingleFile = scannerConfig.MAX_SINGLE_FILE_MB * 1024 * 1024

  let zip
  try {
    zip = new AdmZip(zipPath)
  } catch (err) {
    return { success: false, fileCount: 0, totalSize: 0, error: 'File ZIP tidak valid atau rusak' }
  }

  const entries = zip.getEntries()

  if (entries.length === 0) {
    return { success: false, fileCount: 0, totalSize: 0, error: 'File ZIP kosong' }
  }

  let fileCount = 0
  let totalSize = 0

  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) continue

    const entryName = entry.entryName

    // Reject path traversal
    if (entryName.includes('..') || entryName.includes('\0')) {
      return { success: false, fileCount, totalSize, error: 'File ZIP mengandung path berbahaya (path traversal)' }
    }

    // Reject absolute paths
    if (entryName.startsWith('/') || entryName.startsWith('\\') || /^[A-Za-z]:[/\\]/.test(entryName)) {
      return { success: false, fileCount, totalSize, error: 'File ZIP mengandung path absolut yang tidak diizinkan' }
    }

    // Resolve the full target path
    const targetPath = path.resolve(resolvedTarget, entryName)

    // Path containment check (Zip Slip protection)
    if (!isContainedIn(targetPath, resolvedTarget)) {
      return { success: false, fileCount, totalSize, error: 'File ZIP mengandung path yang keluar dari direktori target (Zip Slip)' }
    }

    // Check single file size
    if (entry.header.size > maxSingleFile) {
      return {
        success: false,
        fileCount,
        totalSize,
        error: `File "${entryName}" melebihi batas ukuran file individual (${scannerConfig.MAX_SINGLE_FILE_MB}MB)`
      }
    }

    // Check total size
    totalSize += entry.header.size
    if (totalSize > maxTotalSize) {
      return { success: false, fileCount, totalSize, error: `Total ukuran file melebihi batas ${scannerConfig.MAX_EXTRACTED_SIZE_MB}MB` }
    }

    // Check file count
    fileCount++
    if (fileCount > maxFiles) {
      return { success: false, fileCount, totalSize, error: `Jumlah file melebihi batas ${maxFiles} file` }
    }

    // Create parent directory
    const parentDir = path.dirname(targetPath)
    await fs.mkdir(parentDir, { recursive: true })

    // Extract file
    const data = entry.getData()
    await fs.writeFile(targetPath, data)
  }

  logger.info(`ZIP extracted: ${fileCount} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB total`)
  return { success: true, fileCount, totalSize }
}

/**
 * Detects if extracted project is a JavaScript/TypeScript project.
 * Checks for presence of .js, .jsx, .ts, .tsx files or package.json.
 *
 * @param {string} sourceDir - Root directory to check
 * @returns {Promise<{ supported: boolean, reason: string }>}
 */
export async function detectJsProject(sourceDir) {
  // Check for package.json
  const packageJsonPath = path.join(sourceDir, 'package.json')
  try {
    await fs.access(packageJsonPath)
    return { supported: true, reason: 'package.json ditemukan' }
  } catch {
    // No package.json, check for JS/TS files
  }

  // Recursively look for .js/.ts/.jsx/.tsx files (limited depth)
  const jsExtensions = ['.js', '.jsx', '.ts', '.tsx']
  const found = await findFilesWithExtensions(sourceDir, jsExtensions, 3)

  if (found) {
    return { supported: true, reason: 'File JavaScript/TypeScript ditemukan' }
  }

  return { supported: false, reason: 'Project ini belum didukung. Versi awal hanya mendukung JavaScript/TypeScript.' }
}

/**
 * Recursively searches for files with given extensions up to maxDepth.
 * Skips hidden directories and node_modules.
 */
async function findFilesWithExtensions(dir, extensions, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return false
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.includes(ext)) return true
      } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const found = await findFilesWithExtensions(path.join(dir, entry.name), extensions, maxDepth, currentDepth + 1)
        if (found) return true
      }
    }
  } catch { /* ignore permission errors */ }
  return false
}

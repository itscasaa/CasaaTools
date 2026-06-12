import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Mock adm-zip before importing the module under test
const mockGetEntries = vi.fn()
vi.mock('adm-zip', () => {
  return {
    default: class MockAdmZip {
      constructor(zipPath) {
        // Allow the mock to throw if configured
        const impl = MockAdmZip._implementation
        if (impl) {
          const result = impl(zipPath)
          this.getEntries = result.getEntries
        } else {
          this.getEntries = mockGetEntries
        }
      }
      static _implementation = null
    }
  }
})

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    access: vi.fn(),
    readdir: vi.fn()
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
  readdir: vi.fn()
}))

// Mock scanner config
vi.mock('../../config/scanner.config.js', () => ({
  scannerConfig: {
    MAX_EXTRACTED_FILES: 5000,
    MAX_EXTRACTED_SIZE_MB: 200,
    MAX_SINGLE_FILE_MB: 20
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

import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import { isZipFile, safeExtractZip, detectJsProject } from '../../utils/zip-extractor.js'

describe('zip-extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AdmZip._implementation = null
  })

  describe('isZipFile()', () => {
    it('returns true for valid ZIP magic bytes (local file header)', () => {
      const buffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00])
      expect(isZipFile(buffer)).toBe(true)
    })

    it('returns true for empty archive ZIP magic bytes', () => {
      const buffer = Buffer.from([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00])
      expect(isZipFile(buffer)).toBe(true)
    })

    it('returns false for non-ZIP file (PDF)', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46])
      expect(isZipFile(buffer)).toBe(false)
    })

    it('returns false for null or empty buffer', () => {
      expect(isZipFile(null)).toBe(false)
      expect(isZipFile(Buffer.alloc(0))).toBe(false)
    })

    it('returns false for buffer shorter than 4 bytes', () => {
      const buffer = Buffer.from([0x50, 0x4B])
      expect(isZipFile(buffer)).toBe(false)
    })
  })

  describe('safeExtractZip()', () => {
    function createMockEntry(entryName, size = 100, isDirectory = false) {
      return {
        entryName,
        isDirectory,
        header: { size },
        getData: () => Buffer.alloc(size > 1024 ? 0 : size) // Don't allocate huge buffers in tests
      }
    }

    function setupMockZip(entries) {
      AdmZip._implementation = () => ({
        getEntries: () => entries
      })
    }

    function setupMockZipThrow() {
      AdmZip._implementation = () => {
        throw new Error('Invalid ZIP')
      }
    }

    it('extracts valid ZIP files successfully', async () => {
      const entries = [
        createMockEntry('src/index.js', 500),
        createMockEntry('package.json', 200)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(2)
      expect(result.totalSize).toBe(700)
    })

    it('blocks Zip Slip (path traversal with ..)', async () => {
      const entries = [
        createMockEntry('../../../etc/passwd', 100)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('path berbahaya')
    })

    it('blocks absolute paths starting with /', async () => {
      const entries = [
        createMockEntry('/etc/passwd', 100)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('path absolut')
    })

    it('blocks Windows drive letter paths', async () => {
      const entries = [
        createMockEntry('C:\\Windows\\system32\\cmd.exe', 100)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('path absolut')
    })

    it('blocks null bytes in paths', async () => {
      const entries = [
        createMockEntry('src/index\0.js', 100)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('path berbahaya')
    })

    it('rejects when file count exceeds limit', async () => {
      const entries = []
      for (let i = 0; i <= 5000; i++) {
        entries.push(createMockEntry(`file${i}.js`, 10))
      }
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Jumlah file melebihi batas')
    })

    it('rejects when single file exceeds individual size limit', async () => {
      const bigSize = 21 * 1024 * 1024
      const entries = [
        createMockEntry('big-file.bin', bigSize)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('melebihi batas ukuran file individual')
    })

    it('rejects when total size exceeds limit', async () => {
      // Use many files that together exceed the limit
      // MAX_EXTRACTED_SIZE_MB=200 and MAX_SINGLE_FILE_MB=20
      // So each file is just under 20MB but 11 of them exceed 200MB
      const fileSize = 19 * 1024 * 1024
      const entries = []
      for (let i = 0; i < 11; i++) {
        entries.push(createMockEntry(`file${i}.bin`, fileSize))
      }
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Total ukuran file melebihi batas')
    })

    it('rejects empty ZIP', async () => {
      setupMockZip([])

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('ZIP kosong')
    })

    it('handles invalid/corrupt ZIP gracefully', async () => {
      setupMockZipThrow()

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(false)
      expect(result.error).toContain('tidak valid atau rusak')
    })

    it('skips directory entries', async () => {
      const entries = [
        createMockEntry('src/', 0, true),
        createMockEntry('src/index.js', 300)
      ]
      setupMockZip(entries)

      const result = await safeExtractZip('/fake/path.zip', '/fake/target')

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(1)
      expect(result.totalSize).toBe(300)
    })
  })

  describe('detectJsProject()', () => {
    it('detects project with package.json', async () => {
      fs.access.mockResolvedValueOnce(undefined)

      const result = await detectJsProject('/fake/source')

      expect(result.supported).toBe(true)
      expect(result.reason).toContain('package.json')
    })

    it('detects project with JS files (no package.json)', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'))
      fs.readdir.mockResolvedValueOnce([
        { isFile: () => true, isDirectory: () => false, name: 'app.js' }
      ])

      const result = await detectJsProject('/fake/source')

      expect(result.supported).toBe(true)
      expect(result.reason).toContain('JavaScript/TypeScript')
    })

    it('rejects project with no JS/TS files', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'))
      fs.readdir.mockResolvedValueOnce([
        { isFile: () => true, isDirectory: () => false, name: 'main.py' }
      ])

      const result = await detectJsProject('/fake/source')

      expect(result.supported).toBe(false)
      expect(result.reason).toContain('belum didukung')
    })
  })
})

import { describe, it, expect } from 'vitest'
import path from 'path'
import { isContainedIn, sanitizePath, sanitizeErrorMessage } from './path-containment.js'

describe('isContainedIn', () => {
  it('returns true when path is inside the allowed base', () => {
    const base = path.resolve('/project/workspaces')
    const child = path.resolve('/project/workspaces/scan-abc123/source')
    expect(isContainedIn(child, base)).toBe(true)
  })

  it('returns true when path equals the allowed base', () => {
    const base = path.resolve('/project/workspaces')
    expect(isContainedIn(base, base)).toBe(true)
  })

  it('returns false when path is outside the allowed base', () => {
    const base = path.resolve('/project/workspaces')
    const outside = path.resolve('/project/config/secret.json')
    expect(isContainedIn(outside, base)).toBe(false)
  })

  it('returns false when path uses traversal to escape', () => {
    const base = path.resolve('/project/workspaces')
    const escaped = path.resolve('/project/workspaces/../config/secret.json')
    expect(isContainedIn(escaped, base)).toBe(false)
  })

  it('returns false for null/undefined inputs', () => {
    expect(isContainedIn(null, '/base')).toBe(false)
    expect(isContainedIn('/path', null)).toBe(false)
    expect(isContainedIn(undefined, '/base')).toBe(false)
  })

  it('handles Windows-style paths correctly', () => {
    const base = 'C:\\Users\\dev\\project\\workspaces'
    const child = 'C:\\Users\\dev\\project\\workspaces\\scan-123\\file.js'
    expect(isContainedIn(child, base)).toBe(true)
  })

  it('rejects path that is a prefix but not a child directory', () => {
    const base = path.resolve('/project/work')
    const sibling = path.resolve('/project/workspaces/file.js')
    expect(isContainedIn(sibling, base)).toBe(false)
  })
})

describe('sanitizePath', () => {
  it('accepts a simple relative path', () => {
    expect(sanitizePath('scan-abc123')).toEqual({ valid: true })
  })

  it('accepts a relative path with forward slashes', () => {
    expect(sanitizePath('assets/css/main.css')).toEqual({ valid: true })
  })

  it('rejects paths with .. sequences', () => {
    const result = sanitizePath('../../../etc/passwd')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('..')
  })

  it('rejects paths starting with /', () => {
    const result = sanitizePath('/etc/passwd')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Absolute')
  })

  it('rejects paths starting with backslash', () => {
    const result = sanitizePath('\\Windows\\System32')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Absolute')
  })

  it('rejects Windows drive letter paths', () => {
    const result = sanitizePath('C:\\Users\\admin')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Drive letter')
  })

  it('rejects drive letters with forward slash', () => {
    const result = sanitizePath('D:/projects/secret')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Drive letter')
  })

  it('rejects null bytes', () => {
    const result = sanitizePath('file\0.txt')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('null bytes')
  })

  it('rejects empty string', () => {
    const result = sanitizePath('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects null/undefined input', () => {
    expect(sanitizePath(null).valid).toBe(false)
    expect(sanitizePath(undefined).valid).toBe(false)
  })
})

describe('sanitizeErrorMessage', () => {
  it('replaces Windows absolute paths', () => {
    const msg = 'Error reading C:\\Users\\admin\\project\\secret.key'
    expect(sanitizeErrorMessage(msg)).toBe('Error reading [path hidden]')
  })

  it('replaces Unix /home paths', () => {
    const msg = 'File not found at /home/user/project/data.json'
    expect(sanitizeErrorMessage(msg)).toBe('File not found at [path hidden]')
  })

  it('replaces /var paths', () => {
    const msg = 'Cannot write to /var/log/app.log'
    expect(sanitizeErrorMessage(msg)).toBe('Cannot write to [path hidden]')
  })

  it('replaces /tmp paths', () => {
    const msg = 'Temp file at /tmp/scan-123/result.json failed'
    expect(sanitizeErrorMessage(msg)).toBe('Temp file at [path hidden] failed')
  })

  it('replaces multiple paths in one message', () => {
    const msg = 'Copy from C:\\Users\\dev\\src to D:\\backup\\dest failed'
    const result = sanitizeErrorMessage(msg)
    expect(result).not.toContain('C:\\')
    expect(result).not.toContain('D:\\')
    expect(result).toContain('[path hidden]')
  })

  it('leaves messages without paths unchanged', () => {
    const msg = 'Connection refused at port 3000'
    expect(sanitizeErrorMessage(msg)).toBe(msg)
  })

  it('handles null/undefined input gracefully', () => {
    expect(sanitizeErrorMessage(null)).toBe('')
    expect(sanitizeErrorMessage(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(sanitizeErrorMessage('')).toBe('')
  })

  it('replaces /usr paths', () => {
    const msg = 'Binary at /usr/local/bin/codeql not found'
    expect(sanitizeErrorMessage(msg)).toBe('Binary at [path hidden] not found')
  })

  it('replaces /opt paths', () => {
    const msg = 'Config at /opt/scanner/config.yml'
    expect(sanitizeErrorMessage(msg)).toBe('Config at [path hidden]')
  })
})

import { describe, it, expect } from 'vitest'
import {
  generateLighthouseRecommendations,
  generateCodeqlRecommendations,
  translateScore,
  translateMetric,
  translateMetricName,
  translateCategory,
  translateSeverity,
  translateStatus
} from '../../services/recommendation.service.js'

describe('recommendation.service', () => {
  describe('generateLighthouseRecommendations', () => {
    it('generates recommendations for known audit IDs', () => {
      const audits = [
        { id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', estimatedSavingsMs: 1500 },
        { id: 'unused-css-rules', title: 'Remove unused CSS', estimatedSavingsMs: 800 }
      ]

      const recommendations = generateLighthouseRecommendations(audits)

      expect(recommendations).toHaveLength(2)
      expect(recommendations[0]).toEqual({
        auditId: 'render-blocking-resources',
        title: 'Hilangkan Sumber Daya yang Memblokir Render',
        impact: 'Dampak Tinggi',
        description: expect.stringContaining('memblokir render'),
        steps: expect.arrayContaining([
          expect.stringContaining('Tunda pemuatan')
        ])
      })
      expect(recommendations[1]).toEqual({
        auditId: 'unused-css-rules',
        title: 'Hapus CSS yang Tidak Digunakan',
        impact: 'Dampak Sedang',
        description: expect.stringContaining('CSS'),
        steps: expect.any(Array)
      })
    })

    it('generates generic recommendation for unknown audit IDs', () => {
      const audits = [
        { id: 'some-unknown-audit', title: 'Some Unknown Audit', estimatedSavingsMs: 200 }
      ]

      const recommendations = generateLighthouseRecommendations(audits)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].auditId).toBe('some-unknown-audit')
      expect(recommendations[0].title).toContain('Some Unknown Audit')
      expect(recommendations[0].description).toContain('Some Unknown Audit')
      expect(recommendations[0].steps).toHaveLength(3)
      expect(recommendations[0].steps[0]).toContain('dokumentasi resmi')
    })

    it('classifies impact as "Dampak Tinggi" for savings > 1000ms', () => {
      const audits = [{ id: 'render-blocking-resources', title: 'Test', estimatedSavingsMs: 1500 }]
      const recommendations = generateLighthouseRecommendations(audits)
      expect(recommendations[0].impact).toBe('Dampak Tinggi')
    })

    it('classifies impact as "Dampak Sedang" for savings 500-1000ms', () => {
      const audits = [{ id: 'unused-css-rules', title: 'Test', estimatedSavingsMs: 500 }]
      const recommendations = generateLighthouseRecommendations(audits)
      expect(recommendations[0].impact).toBe('Dampak Sedang')
    })

    it('classifies impact as "Dampak Sedang" for savings exactly 1000ms', () => {
      const audits = [{ id: 'unused-css-rules', title: 'Test', estimatedSavingsMs: 1000 }]
      const recommendations = generateLighthouseRecommendations(audits)
      expect(recommendations[0].impact).toBe('Dampak Sedang')
    })

    it('classifies impact as "Dampak Rendah" for savings < 500ms', () => {
      const audits = [{ id: 'dom-size', title: 'Test', estimatedSavingsMs: 200 }]
      const recommendations = generateLighthouseRecommendations(audits)
      expect(recommendations[0].impact).toBe('Dampak Rendah')
    })

    it('defaults to "Dampak Rendah" when estimatedSavingsMs is missing', () => {
      const audits = [{ id: 'render-blocking-resources', title: 'Test' }]
      const recommendations = generateLighthouseRecommendations(audits)
      expect(recommendations[0].impact).toBe('Dampak Rendah')
    })

    it('handles all known audit IDs', () => {
      const knownIds = [
        'render-blocking-resources', 'unused-css-rules', 'unused-javascript',
        'unminified-css', 'unminified-javascript', 'offscreen-images',
        'uses-optimized-images', 'uses-text-compression', 'uses-responsive-images',
        'server-response-time', 'dom-size'
      ]

      const audits = knownIds.map(id => ({ id, title: id, estimatedSavingsMs: 600 }))
      const recommendations = generateLighthouseRecommendations(audits)

      expect(recommendations).toHaveLength(knownIds.length)
      recommendations.forEach((rec, i) => {
        expect(rec.auditId).toBe(knownIds[i])
        expect(rec.title).not.toContain(knownIds[i]) // Should have Indonesian title, not raw ID
        expect(rec.steps.length).toBeGreaterThan(0)
      })
    })

    it('returns empty array for non-array input', () => {
      expect(generateLighthouseRecommendations(null)).toEqual([])
      expect(generateLighthouseRecommendations(undefined)).toEqual([])
      expect(generateLighthouseRecommendations('invalid')).toEqual([])
    })

    it('all recommendations have Indonesian text', () => {
      const audits = [
        { id: 'render-blocking-resources', title: 'Test', estimatedSavingsMs: 1500 },
        { id: 'unknown-thing', title: 'Unknown', estimatedSavingsMs: 300 }
      ]

      const recommendations = generateLighthouseRecommendations(audits)
      recommendations.forEach(rec => {
        // Should not contain only ASCII characters — Indonesian text contains some English-like chars
        // but the impact label should be Indonesian
        expect(['Dampak Tinggi', 'Dampak Sedang', 'Dampak Rendah']).toContain(rec.impact)
        expect(rec.title).toBeTruthy()
        expect(rec.description).toBeTruthy()
        expect(rec.steps.length).toBeGreaterThan(0)
      })
    })
  })

  describe('generateCodeqlRecommendations', () => {
    it('generates recommendation for known path traversal rules', () => {
      const findings = [
        { ruleId: 'js/path-injection', title: 'Path Traversal', severity: 'high', filePath: 'src/file.js', line: 42, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)

      expect(result).toHaveLength(1)
      expect(result[0].recommendation.description).toBe('Kerentanan Path Traversal')
      expect(result[0].recommendation.impact).toContain('file')
      expect(result[0].recommendation.mitigation).toContain('path.resolve()')
      // Original finding fields are preserved
      expect(result[0].ruleId).toBe('js/path-injection')
      expect(result[0].filePath).toBe('src/file.js')
    })

    it('generates recommendation for SSRF rules', () => {
      const findings = [
        { ruleId: 'js/request-forgery', title: 'SSRF', severity: 'high', filePath: 'src/api.js', line: 10, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('SSRF')
      expect(result[0].recommendation.mitigation).toContain('allowlist')
    })

    it('generates recommendation for command injection rules', () => {
      const findings = [
        { ruleId: 'js/command-line-injection', title: 'Command Injection', severity: 'critical', filePath: 'src/exec.js', line: 5, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('Command Injection')
      expect(result[0].recommendation.mitigation).toContain('spawn()')
    })

    it('generates recommendation for hardcoded credentials rules', () => {
      const findings = [
        { ruleId: 'js/hardcoded-credentials', title: 'Hardcoded Password', severity: 'high', filePath: 'src/auth.js', line: 15, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('Kredensial')
      expect(result[0].recommendation.mitigation).toContain('environment variable')
    })

    it('generates recommendation for code injection / eval rules', () => {
      const findings = [
        { ruleId: 'js/code-injection', title: 'Unsafe Eval', severity: 'high', filePath: 'src/util.js', line: 20, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('Code Injection')
      expect(result[0].recommendation.mitigation).toContain('eval()')
    })

    it('generates recommendation for ReDoS rules', () => {
      const findings = [
        { ruleId: 'js/redos', title: 'ReDoS', severity: 'medium', filePath: 'src/regex.js', line: 8, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('ReDoS')
      expect(result[0].recommendation.mitigation).toContain('regex')
    })

    it('matches rules by keyword patterns (e.g., "path" in ruleId)', () => {
      const findings = [
        { ruleId: 'custom/file-path-leak', title: 'File Path Leak', severity: 'medium', filePath: 'src/a.js', line: 1, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toBe('Kerentanan Path Traversal')
    })

    it('matches rules by keyword pattern "ssrf"', () => {
      const findings = [
        { ruleId: 'custom/ssrf-check', title: 'SSRF Check', severity: 'high', filePath: 'src/a.js', line: 1, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('SSRF')
    })

    it('matches rules by keyword pattern "secret"', () => {
      const findings = [
        { ruleId: 'custom/exposed-secret', title: 'Exposed Secret', severity: 'high', filePath: 'src/a.js', line: 1, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('Kredensial')
    })

    it('generates generic recommendation for unknown ruleId', () => {
      const findings = [
        { ruleId: 'custom/unknown-rule', title: 'Unknown Vulnerability', severity: 'low', filePath: 'src/x.js', line: 3, message: 'test' }
      ]

      const result = generateCodeqlRecommendations(findings)
      expect(result[0].recommendation.description).toContain('Unknown Vulnerability')
      expect(result[0].recommendation.impact).toContain('kerentanan')
      expect(result[0].recommendation.mitigation).toContain('custom/unknown-rule')
    })

    it('preserves all original finding fields', () => {
      const finding = { ruleId: 'js/path-injection', title: 'Path Traversal', severity: 'high', filePath: 'src/file.js', line: 42, message: 'User input flows to file read' }
      const result = generateCodeqlRecommendations([finding])

      expect(result[0].ruleId).toBe(finding.ruleId)
      expect(result[0].title).toBe(finding.title)
      expect(result[0].severity).toBe(finding.severity)
      expect(result[0].filePath).toBe(finding.filePath)
      expect(result[0].line).toBe(finding.line)
      expect(result[0].message).toBe(finding.message)
    })

    it('returns empty array for non-array input', () => {
      expect(generateCodeqlRecommendations(null)).toEqual([])
      expect(generateCodeqlRecommendations(undefined)).toEqual([])
      expect(generateCodeqlRecommendations('invalid')).toEqual([])
    })

    it('all recommendations are in Bahasa Indonesia', () => {
      const findings = [
        { ruleId: 'js/path-injection', title: 'Path Traversal', severity: 'high', filePath: 'src/a.js', line: 1, message: 'msg' },
        { ruleId: 'js/request-forgery', title: 'SSRF', severity: 'high', filePath: 'src/b.js', line: 2, message: 'msg' },
        { ruleId: 'js/command-line-injection', title: 'CmdInj', severity: 'critical', filePath: 'src/c.js', line: 3, message: 'msg' },
        { ruleId: 'js/hardcoded-credentials', title: 'Cred', severity: 'high', filePath: 'src/d.js', line: 4, message: 'msg' },
        { ruleId: 'js/code-injection', title: 'Eval', severity: 'high', filePath: 'src/e.js', line: 5, message: 'msg' },
        { ruleId: 'js/redos', title: 'ReDoS', severity: 'medium', filePath: 'src/f.js', line: 6, message: 'msg' },
        { ruleId: 'unknown/rule', title: 'Unknown', severity: 'low', filePath: 'src/g.js', line: 7, message: 'msg' }
      ]

      const results = generateCodeqlRecommendations(findings)
      results.forEach(result => {
        expect(result.recommendation).toBeDefined()
        expect(result.recommendation.description).toBeTruthy()
        expect(result.recommendation.impact).toBeTruthy()
        expect(result.recommendation.mitigation).toBeTruthy()
      })
    })
  })

  describe('re-exported translation functions', () => {
    describe('translateScore', () => {
      it('returns "Buruk" with red for scores 0-49', () => {
        expect(translateScore(0)).toEqual({ label: 'Buruk', color: 'red' })
        expect(translateScore(25)).toEqual({ label: 'Buruk', color: 'red' })
        expect(translateScore(49)).toEqual({ label: 'Buruk', color: 'red' })
      })

      it('returns "Perlu Ditingkatkan" with yellow for scores 50-89', () => {
        expect(translateScore(50)).toEqual({ label: 'Perlu Ditingkatkan', color: 'yellow' })
        expect(translateScore(70)).toEqual({ label: 'Perlu Ditingkatkan', color: 'yellow' })
        expect(translateScore(89)).toEqual({ label: 'Perlu Ditingkatkan', color: 'yellow' })
      })

      it('returns "Baik" with green for scores 90-100', () => {
        expect(translateScore(90)).toEqual({ label: 'Baik', color: 'green' })
        expect(translateScore(100)).toEqual({ label: 'Baik', color: 'green' })
      })
    })

    describe('translateMetric / translateMetricName', () => {
      it('translates known metric IDs', () => {
        expect(translateMetric('LCP')).toBe('Elemen Terbesar Muncul')
        expect(translateMetric('FCP')).toBe('Konten Pertama Muncul')
        expect(translateMetric('TBT')).toBe('Waktu Blocking Total')
        expect(translateMetric('CLS')).toBe('Pergeseran Layout')
        expect(translateMetric('speedIndex')).toBe('Indeks Kecepatan')
      })

      it('returns original ID for unknown metrics', () => {
        expect(translateMetric('unknownMetric')).toBe('unknownMetric')
      })

      it('translateMetricName is an alias for translateMetric', () => {
        expect(translateMetricName('LCP')).toBe(translateMetric('LCP'))
      })
    })

    describe('translateCategory', () => {
      it('translates known categories', () => {
        expect(translateCategory('performance')).toBe('Performa')
        expect(translateCategory('accessibility')).toBe('Aksesibilitas')
        expect(translateCategory('best-practices')).toBe('Praktik Terbaik')
        expect(translateCategory('seo')).toBe('SEO')
      })

      it('returns original ID for unknown categories', () => {
        expect(translateCategory('unknown')).toBe('unknown')
      })
    })

    describe('translateSeverity', () => {
      it('translates known severities', () => {
        expect(translateSeverity('critical')).toBe('Kritis')
        expect(translateSeverity('high')).toBe('Tinggi')
        expect(translateSeverity('medium')).toBe('Sedang')
        expect(translateSeverity('low')).toBe('Rendah')
        expect(translateSeverity('info')).toBe('Informasi')
      })

      it('returns original severity for unknown values', () => {
        expect(translateSeverity('unknown')).toBe('unknown')
      })
    })

    describe('translateStatus', () => {
      it('translates all known statuses', () => {
        expect(translateStatus('queued')).toBe('Dalam Antrean')
        expect(translateStatus('validating')).toBe('Memvalidasi Target')
        expect(translateStatus('preparing')).toBe('Menyiapkan Pemindaian')
        expect(translateStatus('running')).toBe('Pemindaian Berjalan')
        expect(translateStatus('analyzing')).toBe('Menganalisis Hasil')
        expect(translateStatus('parsing')).toBe('Membaca Hasil')
        expect(translateStatus('completed')).toBe('Selesai')
        expect(translateStatus('failed')).toBe('Gagal')
        expect(translateStatus('timeout')).toBe('Waktu Habis')
        expect(translateStatus('cancelled')).toBe('Dibatalkan')
        expect(translateStatus('stale')).toBe('Terhenti')
      })

      it('returns original status for unknown values', () => {
        expect(translateStatus('unknown')).toBe('unknown')
      })
    })
  })
})

/**
 * Recommendation Service
 *
 * Generates actionable Indonesian-language recommendations for
 * Lighthouse audit failures and CodeQL security findings.
 *
 * Re-exports translation helpers from scanner-translations.js for convenience.
 */

import {
  translateStatus,
  translateScore,
  translateMetric,
  translateCategory,
  translateSeverity
} from '../utils/scanner-translations.js'

// Re-export translation functions so consumers can import from one place
export { translateStatus, translateScore, translateMetric, translateCategory, translateSeverity }

/**
 * Known Lighthouse audit recommendations in Bahasa Indonesia.
 * Each entry provides a title, description, and actionable steps.
 */
const LIGHTHOUSE_RECOMMENDATIONS = {
  'render-blocking-resources': {
    title: 'Hilangkan Sumber Daya yang Memblokir Render',
    description: 'Sumber daya JavaScript dan CSS yang memblokir render menunda waktu tampilan pertama halaman.',
    steps: [
      'Tunda pemuatan file JavaScript yang tidak kritis menggunakan atribut defer atau async',
      'Pindahkan CSS kritis ke inline <style> di dalam <head>',
      'Muat stylesheet non-kritis secara asinkron menggunakan media="print" dengan onload handler'
    ]
  },
  'unused-css-rules': {
    title: 'Hapus CSS yang Tidak Digunakan',
    description: 'File CSS yang tidak digunakan memperlambat pemuatan halaman karena browser harus mengunduh dan memparse seluruh file.',
    steps: [
      'Gunakan alat coverage di DevTools untuk mengidentifikasi CSS yang tidak digunakan',
      'Pisahkan CSS kritis dari CSS non-kritis',
      'Hapus aturan CSS yang tidak diperlukan pada halaman ini'
    ]
  },
  'unused-javascript': {
    title: 'Hapus JavaScript yang Tidak Digunakan',
    description: 'File JavaScript yang tidak digunakan memperlambat pemuatan halaman dan memblokir thread utama.',
    steps: [
      'Gunakan code splitting untuk memuat kode hanya saat diperlukan',
      'Hapus library atau modul yang tidak digunakan dari bundle',
      'Implementasikan tree shaking pada proses build'
    ]
  },
  'unminified-css': {
    title: 'Minifikasi CSS',
    description: 'File CSS yang tidak diminifikasi memiliki ukuran lebih besar dari yang diperlukan.',
    steps: [
      'Gunakan tool minifikasi CSS seperti cssnano atau clean-css',
      'Konfigurasikan proses build untuk meminifikasi CSS secara otomatis',
      'Aktifkan kompresi Gzip atau Brotli di server untuk file CSS'
    ]
  },
  'unminified-javascript': {
    title: 'Minifikasi JavaScript',
    description: 'File JavaScript yang tidak diminifikasi memiliki ukuran lebih besar dari yang diperlukan.',
    steps: [
      'Gunakan tool minifikasi seperti Terser atau UglifyJS',
      'Konfigurasikan proses build untuk meminifikasi JavaScript secara otomatis',
      'Aktifkan kompresi Gzip atau Brotli di server untuk file JavaScript'
    ]
  },
  'offscreen-images': {
    title: 'Tunda Pemuatan Gambar di Luar Layar',
    description: 'Gambar yang tidak terlihat di viewport awal dimuat bersamaan dengan gambar utama, memperlambat pemuatan halaman.',
    steps: [
      'Tambahkan atribut loading="lazy" pada tag <img> yang berada di bawah fold',
      'Gunakan Intersection Observer API untuk pemuatan gambar kustom',
      'Prioritaskan pemuatan gambar yang terlihat di viewport pertama'
    ]
  },
  'uses-optimized-images': {
    title: 'Gunakan Format Gambar yang Dioptimasi',
    description: 'Gambar yang tidak dioptimasi memiliki ukuran file yang besar dan memperlambat pemuatan halaman.',
    steps: [
      'Konversi gambar ke format modern seperti WebP atau AVIF',
      'Kompres gambar menggunakan tool seperti Sharp atau Squoosh',
      'Gunakan elemen <picture> dengan fallback untuk browser lama'
    ]
  },
  'uses-text-compression': {
    title: 'Aktifkan Kompresi Teks',
    description: 'Respons berbasis teks (HTML, CSS, JS) yang tidak dikompresi memiliki ukuran transfer yang lebih besar.',
    steps: [
      'Aktifkan kompresi Gzip atau Brotli di konfigurasi server',
      'Pastikan semua respons text/html, text/css, dan application/javascript dikompresi',
      'Verifikasi header Content-Encoding pada respons server'
    ]
  },
  'uses-responsive-images': {
    title: 'Gunakan Gambar Responsif',
    description: 'Gambar yang lebih besar dari ukuran tampilan membuang bandwidth dan memperlambat pemuatan.',
    steps: [
      'Gunakan atribut srcset dan sizes pada tag <img>',
      'Sediakan gambar dalam berbagai resolusi untuk device berbeda',
      'Gunakan elemen <picture> untuk art direction pada breakpoint berbeda'
    ]
  },
  'server-response-time': {
    title: 'Kurangi Waktu Respons Server (TTFB)',
    description: 'Waktu respons server yang lama menunda seluruh proses pemuatan halaman.',
    steps: [
      'Optimalkan logika server-side dan query database',
      'Gunakan CDN untuk menyajikan konten dari lokasi terdekat pengguna',
      'Implementasikan caching pada respons yang jarang berubah'
    ]
  },
  'dom-size': {
    title: 'Kurangi Ukuran DOM',
    description: 'DOM yang terlalu besar memperlambat rendering dan interaksi halaman.',
    steps: [
      'Hindari nesting elemen HTML yang terlalu dalam',
      'Gunakan virtualisasi untuk daftar panjang (virtual scrolling)',
      'Hapus elemen DOM yang tidak terlihat atau tidak diperlukan'
    ]
  }
}

/**
 * Known CodeQL rule recommendations in Bahasa Indonesia.
 * Maps rule patterns to recommendation objects.
 */
const CODEQL_RECOMMENDATIONS = {
  'path-traversal': {
    description: 'Kerentanan Path Traversal',
    impact: 'Penyerang dapat mengakses file di luar direktori yang diizinkan',
    mitigation: 'Gunakan path.resolve() dan validasi bahwa path hasil resolve berada di dalam direktori yang diizinkan'
  },
  'ssrf': {
    description: 'Kerentanan Server-Side Request Forgery (SSRF)',
    impact: 'Penyerang dapat memaksa server melakukan request ke layanan internal atau infrastruktur cloud',
    mitigation: 'Validasi dan batasi URL tujuan, tolak alamat IP privat dan localhost, gunakan allowlist domain yang diperbolehkan'
  },
  'command-injection': {
    description: 'Kerentanan Command Injection',
    impact: 'Penyerang dapat mengeksekusi perintah sistem operasi secara sewenang-wenang di server',
    mitigation: 'Gunakan child_process.spawn() dengan argumen array terpisah, hindari shell: true, dan validasi semua input pengguna'
  },
  'hardcoded-credentials': {
    description: 'Kredensial yang Dikodekan Langsung (Hardcoded)',
    impact: 'Kredensial yang tersimpan dalam kode sumber dapat diakses oleh siapa saja yang memiliki akses ke repository',
    mitigation: 'Simpan kredensial di environment variable atau secret manager, jangan pernah menyimpan password atau API key dalam kode sumber'
  },
  'code-injection': {
    description: 'Kerentanan Code Injection (Eval Tidak Aman)',
    impact: 'Penyerang dapat mengeksekusi kode JavaScript secara sewenang-wenang di server',
    mitigation: 'Hindari penggunaan eval(), Function(), atau setTimeout/setInterval dengan string, gunakan parser yang aman untuk memproses data dinamis'
  },
  'redos': {
    description: 'Kerentanan Regular Expression Denial of Service (ReDoS)',
    impact: 'Penyerang dapat menyebabkan server tidak responsif dengan mengirim input yang memicu backtracking eksponensial pada regex',
    mitigation: 'Gunakan regex yang sederhana dan linier, batasi panjang input, gunakan library regex yang aman seperti re2 untuk pola kompleks'
  }
}

/**
 * Classifies the impact level based on estimated savings in milliseconds.
 * @param {number} estimatedSavingsMs - Estimated savings in milliseconds.
 * @returns {string} Impact label in Indonesian.
 */
function classifyImpact(estimatedSavingsMs) {
  if (estimatedSavingsMs > 1000) return 'Dampak Tinggi'
  if (estimatedSavingsMs >= 500) return 'Dampak Sedang'
  return 'Dampak Rendah'
}

/**
 * Generates Indonesian recommendations for failed Lighthouse audits.
 *
 * @param {Array<{id: string, title: string, description?: string, estimatedSavingsMs?: number}>} audits
 * @returns {Array<{auditId: string, title: string, impact: string, description: string, steps: string[]}>}
 */
export function generateLighthouseRecommendations(audits) {
  if (!Array.isArray(audits)) return []

  return audits.map((audit) => {
    const known = LIGHTHOUSE_RECOMMENDATIONS[audit.id]
    const estimatedSavingsMs = audit.estimatedSavingsMs || 0
    const impact = classifyImpact(estimatedSavingsMs)

    if (known) {
      return {
        auditId: audit.id,
        title: known.title,
        impact,
        description: known.description,
        steps: [...known.steps]
      }
    }

    // Generic recommendation for unknown audit IDs
    const auditName = audit.title || audit.id
    return {
      auditId: audit.id,
      title: `Perbaiki: ${auditName}`,
      impact,
      description: `Audit "${auditName}" menunjukkan area yang perlu diperbaiki untuk meningkatkan performa halaman.`,
      steps: [
        `Periksa dokumentasi resmi Lighthouse untuk audit "${audit.id}"`,
        'Analisis dampak terhadap performa menggunakan Chrome DevTools',
        'Terapkan perbaikan yang direkomendasikan dan ukur kembali hasilnya'
      ]
    }
  })
}

/**
 * Matches a CodeQL ruleId to a known recommendation pattern.
 * @param {string} ruleId - The CodeQL rule identifier.
 * @returns {object|null} The matching recommendation or null.
 */
function matchCodeqlRule(ruleId) {
  if (!ruleId) return null

  const lower = ruleId.toLowerCase()

  // Exact known rules
  if (ruleId === 'js/path-injection' || lower.includes('path')) {
    return CODEQL_RECOMMENDATIONS['path-traversal']
  }
  if (ruleId === 'js/request-forgery' || lower.includes('ssrf') || lower.includes('request-forgery')) {
    return CODEQL_RECOMMENDATIONS['ssrf']
  }
  if (ruleId === 'js/command-line-injection' || lower.includes('command')) {
    return CODEQL_RECOMMENDATIONS['command-injection']
  }
  if (ruleId === 'js/hardcoded-credentials' || lower.includes('secret') || lower.includes('credential') || lower.includes('password')) {
    return CODEQL_RECOMMENDATIONS['hardcoded-credentials']
  }
  if (ruleId === 'js/code-injection' || lower.includes('eval') || lower.includes('injection')) {
    return CODEQL_RECOMMENDATIONS['code-injection']
  }
  if (ruleId === 'js/redos' || lower.includes('redos') || lower.includes('regex')) {
    return CODEQL_RECOMMENDATIONS['redos']
  }

  return null
}

/**
 * Generates Indonesian recommendations for CodeQL security findings.
 * Enriches each finding with a `recommendation` field.
 *
 * @param {Array<{ruleId: string, title: string, severity: string, filePath: string, line: number, message: string}>} findings
 * @returns {Array<{...finding, recommendation: {description: string, impact: string, mitigation: string}}>}
 */
export function generateCodeqlRecommendations(findings) {
  if (!Array.isArray(findings)) return []

  return findings.map((finding) => {
    const matched = matchCodeqlRule(finding.ruleId)

    if (matched) {
      return {
        ...finding,
        recommendation: { ...matched }
      }
    }

    // Generic recommendation for unknown ruleIds
    const ruleName = finding.title || finding.ruleId || 'tidak diketahui'
    return {
      ...finding,
      recommendation: {
        description: `Temuan Keamanan: ${ruleName}`,
        impact: 'Potensi kerentanan keamanan yang perlu ditinjau lebih lanjut',
        mitigation: `Periksa dokumentasi resmi untuk rule "${finding.ruleId || 'unknown'}" dan terapkan langkah mitigasi yang direkomendasikan`
      }
    }
  })
}

// Alias re-exports with names matching the task spec
export const translateMetricName = translateMetric
export const translateScoreLabel = translateScore

/**
 * Demo Service — Generates realistic mock results for Lighthouse and CodeQL scanners.
 * Used when tools are not available or when sourceType is 'demo'.
 * All user-facing text is in Bahasa Indonesia.
 *
 * Results are deterministic (no random values) to enable predictable testing.
 */

/**
 * Generates a realistic mock Lighthouse performance audit result.
 * Scores are intentionally varied (not all perfect) to simulate a real-world website.
 *
 * @returns {object} Mock Lighthouse result matching the LighthouseResult schema
 */
export function generateLighthouseDemo() {
  return {
    scores: {
      performance: 72,
      accessibility: 88,
      bestPractices: 92,
      seo: 85
    },
    coreWebVitals: {
      fcp: 1800,
      lcp: 3200,
      tbt: 280,
      cls: 0.12,
      speedIndex: 3800
    },
    opportunities: [
      {
        id: 'render-blocking-resources',
        title: 'Hilangkan sumber daya yang memblokir render',
        description: 'Sumber daya sedang memblokir first paint halaman Anda. Pertimbangkan untuk mengirim CSS kritis secara inline dan menunda semua JS/CSS yang tidak penting.',
        estimatedSavingsMs: 1500
      },
      {
        id: 'unused-css-rules',
        title: 'Kurangi CSS yang tidak terpakai',
        description: 'Kurangi aturan CSS yang tidak digunakan dari stylesheet dan tunda pemuatan CSS yang tidak dipakai untuk konten above-the-fold.',
        estimatedSavingsMs: 1200
      },
      {
        id: 'unused-javascript',
        title: 'Kurangi JavaScript yang tidak terpakai',
        description: 'Kurangi JavaScript yang tidak digunakan dan tunda pemuatan skrip sampai diperlukan untuk mengurangi bytes yang dikonsumsi oleh aktivitas jaringan.',
        estimatedSavingsMs: 980
      },
      {
        id: 'modern-image-formats',
        title: 'Sajikan gambar dalam format modern',
        description: 'Format gambar seperti WebP dan AVIF seringkali memberikan kompresi yang lebih baik dibanding PNG atau JPEG, yang berarti unduhan lebih cepat dan konsumsi data lebih sedikit.',
        estimatedSavingsMs: 850
      },
      {
        id: 'efficiently-encode-images',
        title: 'Enkode gambar secara efisien',
        description: 'Gambar yang dioptimalkan dimuat lebih cepat dan mengkonsumsi data seluler lebih sedikit.',
        estimatedSavingsMs: 720
      },
      {
        id: 'preload-lcp-image',
        title: 'Preload gambar Largest Contentful Paint',
        description: 'Lakukan preload gambar yang digunakan oleh elemen LCP untuk meningkatkan waktu LCP Anda.',
        estimatedSavingsMs: 650
      },
      {
        id: 'unminified-javascript',
        title: 'Minifikasi JavaScript',
        description: 'Minifikasi file JavaScript dapat mengurangi ukuran payload dan waktu parsing skrip.',
        estimatedSavingsMs: 480
      }
    ],
    diagnostics: [
      {
        id: 'dom-size',
        title: 'Hindari ukuran DOM yang berlebihan',
        description: 'DOM yang besar akan meningkatkan penggunaan memori, menyebabkan penghitungan style yang lebih lama, dan menghasilkan reflow layout yang mahal.',
        details: '1.500 elemen'
      },
      {
        id: 'mainthread-work-breakdown',
        title: 'Minimalkan pekerjaan main-thread',
        description: 'Pertimbangkan untuk mengurangi waktu yang dihabiskan untuk parsing, kompilasi, dan eksekusi JS. Anda mungkin dapat mengirimkan payload JS yang lebih kecil.',
        details: '3,2 detik'
      },
      {
        id: 'bootup-time',
        title: 'Kurangi waktu eksekusi JavaScript',
        description: 'Pertimbangkan untuk mengurangi waktu yang dihabiskan untuk parsing, kompilasi, dan eksekusi JS. Anda mungkin dapat mengirimkan payload JS yang lebih kecil.',
        details: '2,8 detik'
      },
      {
        id: 'font-display',
        title: 'Pastikan teks tetap terlihat selama pemuatan webfont',
        description: 'Gunakan fitur CSS font-display untuk memastikan teks terlihat oleh pengguna saat webfont sedang dimuat.',
        details: '3 font terpengaruh'
      },
      {
        id: 'third-party-summary',
        title: 'Kurangi dampak kode pihak ketiga',
        description: 'Kode pihak ketiga dapat berdampak signifikan pada performa pemuatan. Batasi jumlah penyedia pihak ketiga yang redundan dan coba muat kode pihak ketiga setelah halaman selesai dimuat.',
        details: '5 pihak ketiga ditemukan'
      }
    ],
    recommendations: [],
    files: {
      result: 'lighthouse-result.json',
      summary: 'summary.json',
      report: 'lighthouse-report.html'
    }
  }
}


/**
 * Generates a realistic mock CodeQL security scan result.
 * Includes findings covering all severity levels: critical (1), high (2), medium (1), low (1).
 * All file paths are relative — no absolute server paths.
 *
 * @returns {object} Mock CodeQL result matching the CodeqlResult schema
 */
export function generateCodeqlDemo() {
  const findings = [
    {
      ruleId: 'js/command-injection',
      title: 'Injeksi Perintah (Command Injection)',
      severity: 'critical',
      filePath: 'src/controllers/deploy.controller.js',
      line: 67,
      message: 'Input pengguna digunakan langsung dalam eksekusi perintah shell tanpa sanitasi.',
      recommendation: null
    },
    {
      ruleId: 'js/path-injection',
      title: 'Path Traversal',
      severity: 'high',
      filePath: 'src/utils/file.js',
      line: 42,
      message: 'Path yang dikontrol pengguna digunakan dalam operasi file tanpa validasi batasan direktori.',
      recommendation: null
    },
    {
      ruleId: 'js/ssrf',
      title: 'Risiko SSRF (Server-Side Request Forgery)',
      severity: 'high',
      filePath: 'src/services/proxy.service.js',
      line: 28,
      message: 'URL yang dikontrol pengguna digunakan dalam permintaan HTTP sisi server tanpa validasi.',
      recommendation: null
    },
    {
      ruleId: 'js/hardcoded-credentials',
      title: 'Kredensial Tersimpan dalam Kode (Hardcoded Secret)',
      severity: 'medium',
      filePath: 'src/config/database.js',
      line: 15,
      message: 'String yang tampak seperti kredensial ditemukan langsung dalam kode sumber.',
      recommendation: null
    },
    {
      ruleId: 'js/insecure-randomness',
      title: 'Penggunaan Randomness Tidak Aman',
      severity: 'low',
      filePath: 'src/utils/token.js',
      line: 8,
      message: 'Math.random() digunakan untuk menghasilkan nilai yang seharusnya tidak dapat diprediksi. Gunakan crypto.randomBytes() sebagai gantinya.',
      recommendation: null
    }
  ]

  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  }

  for (const finding of findings) {
    bySeverity[finding.severity]++
  }

  return {
    summary: {
      total: findings.length,
      bySeverity
    },
    findings,
    files: {
      sarif: 'codeql-results.sarif',
      findings: 'findings.json'
    }
  }
}

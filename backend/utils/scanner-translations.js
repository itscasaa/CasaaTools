/**
 * Indonesian translation maps for the Security & Performance Scanner.
 * All user-facing output is presented in Bahasa Indonesia.
 */

/**
 * Scan job status translations.
 */
export const STATUS_MAP = {
  queued: 'Dalam Antrean',
  validating: 'Memvalidasi Target',
  preparing: 'Menyiapkan Pemindaian',
  running: 'Pemindaian Berjalan',
  analyzing: 'Menganalisis Hasil',
  parsing: 'Membaca Hasil',
  completed: 'Selesai',
  failed: 'Gagal',
  timeout: 'Waktu Habis',
  cancelled: 'Dibatalkan',
  stale: 'Terhenti'
}

/**
 * Score label ranges with associated colors.
 */
export const SCORE_LABELS = [
  { min: 0, max: 49, label: 'Buruk', color: 'red' },
  { min: 50, max: 89, label: 'Perlu Ditingkatkan', color: 'yellow' },
  { min: 90, max: 100, label: 'Baik', color: 'green' }
]

/**
 * Core Web Vitals metric name translations.
 */
export const METRIC_NAMES = {
  LCP: 'Elemen Terbesar Muncul',
  FCP: 'Konten Pertama Muncul',
  TBT: 'Waktu Blocking Total',
  CLS: 'Pergeseran Layout',
  speedIndex: 'Indeks Kecepatan'
}

/**
 * Lighthouse category translations.
 */
export const CATEGORY_MAP = {
  performance: 'Performa',
  accessibility: 'Aksesibilitas',
  'best-practices': 'Praktik Terbaik',
  seo: 'SEO'
}

/**
 * CodeQL severity translations.
 */
export const SEVERITY_MAP = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  info: 'Informasi'
}

/**
 * Translates a scan job status to Bahasa Indonesia.
 * @param {string} status - The internal status key.
 * @returns {string} The translated status label, or the original status if not found.
 */
export function translateStatus(status) {
  return STATUS_MAP[status] || status
}

/**
 * Translates a numeric score (0-100) to a label and color.
 * @param {number} score - Integer score between 0 and 100.
 * @returns {{ label: string, color: string }} The label and associated color.
 */
export function translateScore(score) {
  for (const range of SCORE_LABELS) {
    if (score >= range.min && score <= range.max) {
      return { label: range.label, color: range.color }
    }
  }
  return { label: 'Buruk', color: 'red' }
}

/**
 * Translates a Core Web Vitals metric ID to its Indonesian name.
 * @param {string} metricId - The metric identifier (e.g., "LCP", "FCP").
 * @returns {string} The translated metric name, or the original ID if not found.
 */
export function translateMetric(metricId) {
  return METRIC_NAMES[metricId] || metricId
}

/**
 * Translates a Lighthouse category ID to its Indonesian name.
 * @param {string} categoryId - The category identifier (e.g., "performance").
 * @returns {string} The translated category name, or the original ID if not found.
 */
export function translateCategory(categoryId) {
  return CATEGORY_MAP[categoryId] || categoryId
}

/**
 * Translates a CodeQL severity level to its Indonesian label.
 * @param {string} severity - The severity level (e.g., "critical", "high").
 * @returns {string} The translated severity label, or the original severity if not found.
 */
export function translateSeverity(severity) {
  return SEVERITY_MAP[severity] || severity
}

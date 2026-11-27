/**
 * Normalise text for matching: NFC, lower-case, drop whitespace/commas and common Thai
 * prefixes (ซ., ซอย, ถ., ถนน, ม., หมู่, หมู่บ้าน) so "ซ.สุขุมวิท 21" ≈ "สุขุมวิท21".
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/^(ซอย|ซ\.|ถนน|ถ\.|หมู่บ้าน|หมู่ที่|หมู่|ม\.)\s*/u, '')
    // Keep '/' and '-': "12/3" and "123" are different house numbers.
    .replace(/[\s_,]+/gu, '');
}

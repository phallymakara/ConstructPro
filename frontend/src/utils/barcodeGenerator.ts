/**
 * Simple, robust Code 128 (Subset B) Barcode Generator
 * Generates an SVG path or pattern string without external dependencies.
 */

// Code 128 pattern table (Subset B)
const CODE128_PATTERNS: number[] = [
  212222, 222122, 222221, 121223, 121322, 131222, 122213, 122312, 132212, 221213, // 0-9
  221312, 231212, 112232, 122132, 122231, 113222, 123122, 123221, 223211, 221132, // 10-19
  221231, 213212, 223112, 312131, 311222, 321122, 321221, 312212, 322112, 322211, // 20-29
  212123, 212321, 232121, 111323, 131123, 131321, 112313, 132113, 132311, 211313, // 30-39
  231113, 231311, 112133, 112331, 132131, 113123, 113321, 133121, 313121, 211331, // 40-49
  231131, 213113, 213311, 213131, 311123, 311321, 331121, 312113, 312311, 332111, // 50-59
  314111, 221411, 431111, 111224, 111422, 121124, 121421, 141122, 141221, 112214, // 60-69
  112412, 122114, 122411, 142112, 142211, 241211, 221114, 413111, 241112, 134111, // 70-79
  111242, 121142, 121241, 114212, 124112, 124211, 411212, 421112, 421211, 212141, // 80-89
  214121, 412121, 111143, 111341, 131141, 114113, 114311, 411113, 411311, 113141, // 90-99
  114131, 311141, 411131, 211412, 211214, 211232, 2331112 // 100-106 (104=Start B, 106=Stop)
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes text into a series of 1s (bar) and 0s (space) using Code 128 B.
 */
export function encodeCode128(text: string): string {
  if (!text) return '';
  const clean = text.trim();
  const codes: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    // ASCII 32 to 126 maps directly to values 0 to 94 in Subset B
    if (charCode >= 32 && charCode <= 126) {
      codes.push(charCode - 32);
    } else {
      codes.push(0); // fallback space
    }
  }

  // Calculate checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  // Convert pattern numbers into binary string (1 = bar, 0 = space)
  let binary = '';
  for (const code of codes) {
    const patternStr = String(CODE128_PATTERNS[code]);
    for (let j = 0; j < patternStr.length; j++) {
      const width = parseInt(patternStr[j], 10);
      const bit = j % 2 === 0 ? '1' : '0';
      binary += bit.repeat(width);
    }
  }
  return binary;
}

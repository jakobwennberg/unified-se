/**
 * SIE file encoding utilities.
 *
 * SIE files can use different encodings depending on the source system:
 * - UTF-8 (most modern systems)
 * - CP437 (DOS encoding, common in Swedish accounting software like Fortnox)
 * - ISO-8859-1 (Latin-1, fallback for Swedish characters)
 * - Windows-1252 (similar to ISO-8859-1, common on Windows)
 *
 * Ported from arcim's lib/sie-encoding.ts
 */
import * as iconv from 'iconv-lite';

export type SIEEncoding = 'utf-8' | 'cp437' | 'iso-8859-1' | 'windows-1252';

/**
 * Decode SIE file buffer with automatic encoding detection.
 *
 * Attempts decoding in order of likelihood and validates
 * by checking for the required SIE header marker (#FLAGGA).
 */
export function decodeSIEBuffer(buffer: Buffer): string {
  // Try UTF-8 first (most common, modern standard)
  try {
    const utf8Content = buffer.toString('utf8');
    if (utf8Content.includes('#FLAGGA')) {
      // Remove BOM (Byte Order Mark) if present
      return utf8Content.replace(/^\uFEFF/, '');
    }
  } catch {
    // Continue to next encoding
  }

  // Try CP437 (DOS encoding, common in older Swedish accounting systems)
  try {
    if (iconv.encodingExists('cp437')) {
      const cp437Content = iconv.decode(buffer, 'cp437');
      if (cp437Content.includes('#FLAGGA')) {
        return cp437Content;
      }
    }
  } catch {
    // Continue to next encoding
  }

  // Try ISO-8859-1 (Latin-1, handles Swedish characters åäö)
  try {
    if (iconv.encodingExists('iso-8859-1')) {
      const latin1Content = iconv.decode(buffer, 'iso-8859-1');
      if (latin1Content.includes('#FLAGGA')) {
        return latin1Content;
      }
    }
  } catch {
    // Continue to next encoding
  }

  // Try Windows-1252 (similar to ISO-8859-1 but more common on Windows)
  try {
    if (iconv.encodingExists('windows-1252')) {
      const win1252Content = iconv.decode(buffer, 'windows-1252');
      if (win1252Content.includes('#FLAGGA')) {
        return win1252Content;
      }
    }
  } catch {
    // No valid encoding found
  }

  // If all else fails, force UTF-8
  const fallbackContent = buffer.toString('utf8').replace(/^\uFEFF/, '');

  // Check if we at least have some SIE-like content
  if (
    fallbackContent.includes('#') ||
    fallbackContent.includes('VER') ||
    fallbackContent.includes('TRANS')
  ) {
    return fallbackContent;
  }

  throw new Error(
    'Unable to decode SIE file: No valid encoding detected. ' +
      'File may be corrupted or not a valid SIE file.',
  );
}

/**
 * Decode a SIE buffer with a specific encoding.
 * Falls back to CP437 if no encoding is specified (Fortnox default).
 */
export function decodeSIEBufferWithEncoding(
  buffer: Buffer,
  encoding?: SIEEncoding,
): string {
  if (encoding === 'utf-8') {
    const content = buffer.toString('utf8');
    return content.replace(/^\uFEFF/, '');
  }

  // UTF-8 BOM detection
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString('utf8').slice(1);
  }

  if (encoding) {
    return iconv.decode(buffer, encoding);
  }

  // Default to CP437 for Fortnox files (most common)
  return iconv.decode(buffer, 'cp437');
}

/**
 * Detect encoding of a SIE buffer by trying different encodings.
 * Returns the detected encoding name or null if no valid encoding found.
 */
export function detectSIEEncoding(buffer: Buffer): SIEEncoding | null {
  // Check UTF-8
  try {
    const utf8Content = buffer.toString('utf8');
    if (utf8Content.includes('#FLAGGA')) {
      return 'utf-8';
    }
  } catch {
    // Continue
  }

  // Check CP437
  try {
    if (iconv.encodingExists('cp437')) {
      const cp437Content = iconv.decode(buffer, 'cp437');
      if (cp437Content.includes('#FLAGGA')) {
        return 'cp437';
      }
    }
  } catch {
    // Continue
  }

  // Check ISO-8859-1
  try {
    if (iconv.encodingExists('iso-8859-1')) {
      const latin1Content = iconv.decode(buffer, 'iso-8859-1');
      if (latin1Content.includes('#FLAGGA')) {
        return 'iso-8859-1';
      }
    }
  } catch {
    // Continue
  }

  // Check Windows-1252
  try {
    if (iconv.encodingExists('windows-1252')) {
      const win1252Content = iconv.decode(buffer, 'windows-1252');
      if (win1252Content.includes('#FLAGGA')) {
        return 'windows-1252';
      }
    }
  } catch {
    // No valid encoding found
  }

  return null;
}

// lib/sie-encoding.ts
import iconv from 'iconv-lite';
import logger from './logger';

/**
 * Decode SIE file buffer with automatic encoding detection
 *
 * SIE files can use different encodings depending on the source system:
 * - UTF-8 (most modern systems)
 * - CP437 (DOS/Windows encoding, common in Swedish accounting software)
 * - ISO-8859-1 (Latin-1, fallback for Swedish characters)
 *
 * This function attempts decoding in order of likelihood and validates
 * by checking for the required SIE header marker (#FLAGGA)
 *
 * @param buffer - Raw SIE file as Buffer
 * @returns Decoded SIE file content as string
 */
export function decodeSIEBuffer(buffer: Buffer): string {
  // Try UTF-8 first (most common, modern standard)
  try {
    const utf8Content = buffer.toString('utf8');

    // Check for SIE format marker
    if (utf8Content.includes('#FLAGGA')) {
      logger.info({ encoding: 'UTF-8', size: buffer.length }, 'Successfully decoded SIE file as UTF-8');

      // Remove BOM (Byte Order Mark) if present
      return utf8Content.replace(/^\uFEFF/, '');
    }
  } catch (error) {
    logger.warn({ error }, 'UTF-8 decoding failed, trying next encoding');
  }

  // Try CP437 (DOS encoding, common in older Swedish accounting systems)
  try {
    if (iconv.encodingExists('cp437')) {
      const cp437Content = iconv.decode(buffer, 'cp437');

      if (cp437Content.includes('#FLAGGA')) {
        logger.info({ encoding: 'CP437', size: buffer.length }, 'Successfully decoded SIE file as CP437');
        return cp437Content;
      }
    }
  } catch (error) {
    logger.warn({ error }, 'CP437 decoding failed, trying next encoding');
  }

  // Try ISO-8859-1 (Latin-1, handles Swedish characters åäö)
  try {
    if (iconv.encodingExists('iso-8859-1')) {
      const latin1Content = iconv.decode(buffer, 'iso-8859-1');

      if (latin1Content.includes('#FLAGGA')) {
        logger.info({ encoding: 'ISO-8859-1', size: buffer.length }, 'Successfully decoded SIE file as ISO-8859-1');
        return latin1Content;
      }
    }
  } catch (error) {
    logger.warn({ error }, 'ISO-8859-1 decoding failed, trying next encoding');
  }

  // Try Windows-1252 (similar to ISO-8859-1 but more common on Windows)
  try {
    if (iconv.encodingExists('windows-1252')) {
      const win1252Content = iconv.decode(buffer, 'windows-1252');

      if (win1252Content.includes('#FLAGGA')) {
        logger.info({ encoding: 'Windows-1252', size: buffer.length }, 'Successfully decoded SIE file as Windows-1252');
        return win1252Content;
      }
    }
  } catch (error) {
    logger.warn({ error}, 'Windows-1252 decoding failed');
  }

  // If all else fails, force UTF-8 and hope for the best
  logger.error({ size: buffer.length }, 'Failed to detect SIE file encoding, forcing UTF-8');
  const fallbackContent = buffer.toString('utf8').replace(/^\uFEFF/, '');

  // Check if we at least have some SIE-like content
  if (fallbackContent.includes('#') || fallbackContent.includes('VER') || fallbackContent.includes('TRANS')) {
    logger.warn('Fallback UTF-8 decoding may have encoding errors, but found SIE-like content');
    return fallbackContent;
  }

  // Last resort - throw error
  throw new Error('Unable to decode SIE file: No valid encoding detected. File may be corrupted or not a valid SIE file.');
}

/**
 * Detect encoding of a buffer by trying different encodings
 * Returns the detected encoding name or null if no valid encoding found
 *
 * @param buffer - Raw file buffer
 * @returns Detected encoding name ('utf-8', 'cp437', 'iso-8859-1', 'windows-1252') or null
 */
export function detectSIEEncoding(buffer: Buffer): string | null {
  // Check UTF-8
  try {
    const utf8Content = buffer.toString('utf8');
    if (utf8Content.includes('#FLAGGA')) {
      return 'utf-8';
    }
  } catch {
    // Continue to next encoding
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
    // Continue to next encoding
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
    // Continue to next encoding
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

/**
 * SIE file parser.
 *
 * Ported from arcim's lib/sie-parser.ts — battle-tested against real SIE files
 * from Fortnox, Visma/Spiris, Bokio, and Björn Lundén.
 *
 * Handles format differences between providers:
 * - Fortnox: empty #TRANS fields, quantity in field 6
 * - Spiris: explicit dates and text in #TRANS rows
 * - Both: different verification registration date formats
 */
import type {
  SIEMetadata,
  SIEAccount,
  SIEDimension,
  SIETransaction,
  SIEBalance,
  SIEParseResult,
} from '../types/sie.js';

const ACCOUNT_GROUPS: Record<string, string> = {
  '1': '1 - Tillgångar',
  '2': '2 - Eget kapital och skulder',
  '3': '3 - Rörelsens inkomster och intäkter',
  '4': '4 - Utgifter och kostnader förädling',
  '5': '5 - Övriga externa rörelseutgifter och kostnader',
  '6': '6 - Övriga externa rörelseutgifter och kostnader',
  '7': '7 - Utgifter och kostnader för personal',
  '8': '8 - Finansiella och andra inkomster/utgifter',
};

/**
 * Parse numeric value safely, handling negative zero and empty strings.
 */
function parseAmount(value: string): number {
  if (!value || value === '') return 0;
  const num = parseFloat(value);
  // Handle negative zero: -0 becomes 0
  return Object.is(num, -0) ? 0 : num;
}

/**
 * Parse a SIE-format line into label and parts.
 * Handles quoted strings and {} bracket groups.
 */
function parseLine(
  line: string,
): { label: string; parts: string[] } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('#')) return null;

  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let inBraces = false;
  let braceContent = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    // Handle opening brace (not inside quotes)
    if (char === '{' && !inQuotes) {
      inBraces = true;
      braceContent = '';
      continue;
    }

    // Handle closing brace (not inside quotes)
    if (char === '}' && !inQuotes && inBraces) {
      inBraces = false;
      // Push brace content as single token (even if empty string)
      parts.push(braceContent.trim());
      continue;
    }

    // Accumulate content inside braces
    if (inBraces) {
      braceContent += char;
      continue;
    }

    // Handle quotes — support escaped quotes ("" → ")
    if (char === '"') {
      if (inQuotes && i + 1 < trimmed.length && trimmed[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    // Handle spaces outside quotes/braces
    if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) parts.push(current);
  if (parts.length === 0) return null;

  const label = parts[0]!.substring(1).toUpperCase();
  return { label, parts: parts.slice(1) };
}

/**
 * Parse a verification block (transactions within a #VER).
 * Handles both Fortnox and Spiris formats.
 */
function parseVerificationBlock(
  lines: string[],
  startIndex: number,
  defaultText: string,
  defaultDate: string,
  verSeries: string,
  verNumber: string,
  registrationDate?: string,
): { endIndex: number; transactions: SIETransaction[] } {
  const transactions: SIETransaction[] = [];
  let i = startIndex;

  // Check for opening brace
  if (lines[i + 1]?.trim() === '{') {
    i += 2;
    while (i < lines.length && lines[i]!.trim() !== '}') {
      const parsed = parseLine(lines[i]!);

      // Skip reversed transactions (BTRANS and RTRANS)
      if (
        parsed &&
        (parsed.label === 'BTRANS' || parsed.label === 'RTRANS')
      ) {
        i++;
        continue;
      }

      if (parsed && parsed.label === 'TRANS') {
        const account = parsed.parts[0] || '';
        const dimString = parsed.parts[1] || '';
        const amount = parseAmount(parsed.parts[2] || '');

        // Parse dimensions from dimension string
        let costCenter = '';
        let project = '';
        if (dimString) {
          const dimParts = dimString.split(' ').filter(Boolean);
          for (let d = 0; d < dimParts.length - 1; d += 2) {
            const dimType = dimParts[d];
            const dimValue = dimParts[d + 1]!;
            if (dimType === '1') costCenter = dimValue;
            if (dimType === '6') project = dimValue;
          }
        }

        // Smart detection of date/text based on format
        let dateStr = defaultDate;
        let textStr = defaultText;

        // Get remaining parts after account, dimensions, and amount
        const remainingParts = parsed.parts.slice(3);

        // Filter out empty strings and likely quantity fields
        const meaningfulParts = remainingParts.filter((p) => {
          if (!p || p === '') return false;
          if (/^\d+$/.test(p) && parseInt(p, 10) <= 100) return false;
          return true;
        });

        if (meaningfulParts.length > 0) {
          const firstPart = meaningfulParts[0]!;

          // Check if first meaningful part is a date (YYYYMMDD = 8 digits)
          if (/^\d{8}$/.test(firstPart)) {
            // Spiris format: has explicit date
            dateStr = firstPart;
            if (meaningfulParts.length > 1) {
              textStr = meaningfulParts[1]!;
            }
          } else {
            // First part is text, not a date
            textStr = firstPart;
          }
        }

        // Extract quantity from field 6 (parts[5]) if present
        const quantity = parsed.parts[5]
          ? parseAmount(parsed.parts[5])
          : undefined;

        transactions.push({
          verificationSeries: verSeries,
          verificationNumber: verNumber,
          verificationDate: dateStr,
          verificationText: textStr,
          accountNumber: account,
          amount,
          costCenter,
          project,
          rowText: textStr,
          quantity: quantity !== 0 ? quantity : undefined,
          registrationDate: registrationDate || undefined,
        });
      }
      i++;
    }
  }

  return { endIndex: i, transactions };
}

/**
 * Parse SIE file content string into structured data.
 *
 * Content should already be decoded to a UTF-8 string before calling
 * this function — use `decodeSIEBuffer()` from `./encoding.ts` first.
 */
export function parseSIE(content: string): SIEParseResult {
  // Normalize CRLF to LF for consistent parsing
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');

  const metadata: SIEMetadata = {
    companyName: 'Okänd',
    currency: 'SEK',
    generatedDate: null,
    sieType: null,
    fiscalYearStart: null,
    fiscalYearEnd: null,
  };

  const accounts: SIEAccount[] = [];
  const accountTaxCodes = new Map<string, string>();
  const dimensions: SIEDimension[] = [];
  const transactions: SIETransaction[] = [];
  const balances: SIEBalance[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]!);
    if (!parsed) continue;

    const { label, parts } = parsed;

    switch (label) {
      case 'SIETYP':
        metadata.sieType = parts[0] || null;
        break;

      case 'FNAMN':
        metadata.companyName = parts[0] || 'Okänd';
        break;

      case 'VALUTA':
        metadata.currency = parts[0] || 'SEK';
        break;

      case 'GEN':
        if (parts[0]) {
          const d = parts[0];
          metadata.generatedDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        }
        break;

      case 'ORGNR':
        metadata.orgNumber = parts[0] || undefined;
        break;

      case 'RAR':
        // Fiscal year: #RAR 0 20230101 20231231
        if (parts[0] === '0' && parts[1] && parts[2]) {
          const start = parts[1];
          const end = parts[2];
          metadata.fiscalYearStart = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
          metadata.fiscalYearEnd = `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
        }
        break;

      case 'OMFATTN':
        // Period coverage date: #OMFATTN 20251031
        if (parts[0]) {
          const d = parts[0];
          metadata.omfattnDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        }
        break;

      case 'KONTO':
        if (parts[0] && parts[1]) {
          const accountNumber = parts[0];
          accounts.push({
            accountNumber,
            accountName: parts[1],
            accountGroup: ACCOUNT_GROUPS[accountNumber[0]!] || '',
            taxCode: accountTaxCodes.get(accountNumber),
          });
        }
        break;

      case 'SRU':
        // Tax reporting code (Fortnox): #SRU 1010 7201
        if (parts[0] && parts[1]) {
          accountTaxCodes.set(parts[0], parts[1]);
        }
        break;

      case 'IB':
        if (parts[0] && parts[1] && parts[2]) {
          balances.push({
            accountNumber: parts[1],
            balanceType: 'IB',
            yearIndex: parseInt(parts[0], 10),
            amount: parseAmount(parts[2]),
            quantity: parts[3] ? parseAmount(parts[3]) : undefined,
          });
        }
        break;

      case 'UB':
        if (parts[0] && parts[1] && parts[2]) {
          balances.push({
            accountNumber: parts[1],
            balanceType: 'UB',
            yearIndex: parseInt(parts[0], 10),
            amount: parseAmount(parts[2]),
            quantity: parts[3] ? parseAmount(parts[3]) : undefined,
          });
        }
        break;

      case 'RES':
        if (parts[0] && parts[1] && parts[2]) {
          balances.push({
            accountNumber: parts[1],
            balanceType: 'RES',
            yearIndex: parseInt(parts[0], 10),
            amount: parseAmount(parts[2]),
            quantity: parts[3] ? parseAmount(parts[3]) : undefined,
          });
        }
        break;

      case 'OBJEKT':
        if (parts[0] && parts[1]) {
          dimensions.push({
            dimensionType: parseInt(parts[0], 10),
            code: parts[1],
            name: parts[2] || parts[1],
          });
        }
        break;

      case 'VER': {
        const verSeries = parts[0] || '';
        const verNumber = parts[1] || '';
        const verDate = parts[2] || '';
        const verText = parts[3] || '';
        const verRegistrationDate = parts[4] || undefined;

        const { endIndex, transactions: verTrans } =
          parseVerificationBlock(
            lines,
            i,
            verText,
            verDate,
            verSeries,
            verNumber,
            verRegistrationDate,
          );

        transactions.push(...verTrans);
        i = endIndex;
        break;
      }
    }
  }

  // Update accounts with SRU codes that were parsed after KONTO lines
  for (const account of accounts) {
    if (!account.taxCode && accountTaxCodes.has(account.accountNumber)) {
      account.taxCode = accountTaxCodes.get(account.accountNumber);
    }
  }

  return { metadata, accounts, dimensions, transactions, balances };
}

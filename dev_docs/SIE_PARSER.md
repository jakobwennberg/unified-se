// lib/sie-parser.ts
// SIE (Swedish accounting file format) parser
import * as iconv from 'iconv-lite';

export interface SIEMetadata {
  companyName: string;
  currency: string;
  generatedDate: string | null;
  sieType: string | null;
  fiscalYearStart: string | null;
  fiscalYearEnd: string | null;
  orgNumber?: string; // Organization number (#ORGNR)
  omfattnDate?: string; // #OMFATTN - Date of last transaction (actual period end for partial years)
}

export interface SIEAccount {
  accountNumber: string;
  accountName: string;
  accountGroup: string;
  taxCode?: string; // SRU code for Fortnox compatibility
}

export interface SIEDimension {
  dimensionType: number;
  code: string;
  name: string;
}

export interface SIETransaction {
  verificationSeries: string;
  verificationNumber: string;
  verificationDate: string;
  verificationText: string;
  accountNumber: string;
  amount: number;
  costCenter: string;
  project: string;
  rowText: string;
  quantity?: number; // Optional quantity field from SIE (#TRANS field 6)
  registrationDate?: string; // Optional registration date from #VER (field 5)
}

export interface SIEBalance {
  accountNumber: string;
  balanceType: 'IB' | 'UB' | 'RES'; // Opening, Closing, Result
  yearIndex: number; // 0 = current, -1 = previous, etc.
  amount: number;
  quantity?: number; // Optional quantity field (#IB/#UB/#RES field 4)
}

export interface SIEParseResult {
  metadata: SIEMetadata;
  accounts: SIEAccount[];
  dimensions: SIEDimension[];
  transactions: SIETransaction[];
  balances: SIEBalance[];
}

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
 * Parse numeric value safely, handling negative zero and empty strings
 */
function parseAmount(value: string): number {
  if (!value || value === '') return 0;
  const num = parseFloat(value);
  // Handle negative zero: -0 becomes 0
  return Object.is(num, -0) ? 0 : num;
}

/**
 * Parse a SIE-format line into label and parts
 * Handles quoted strings with {} brackets
 */
function parseLine(line: string): { label: string; parts: string[] } | null {
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

    // Handle quotes - support escaped quotes ("" → ")
    if (char === '"') {
      // Check for doubled quotes (escaped quote)
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

  const label = parts[0].substring(1).toUpperCase();
  return { label, parts: parts.slice(1) };
}

/**
 * Parse verification block (transactions within a VER)
 * Handles both Fortnox and Spiris formats
 */
function parseVerificationBlock(
  lines: string[],
  startIndex: number,
  defaultText: string,
  defaultDate: string,
  verSeries: string,
  verNumber: string,
  registrationDate?: string
): { endIndex: number; transactions: SIETransaction[] } {
  const transactions: SIETransaction[] = [];
  let i = startIndex;

  // Check for opening brace
  if (lines[i + 1]?.trim() === '{') {
    i += 2;
    while (i < lines.length && lines[i].trim() !== '}') {
      const parsed = parseLine(lines[i]);

      // Skip reversed transactions (BTRANS and RTRANS)
      if (parsed && (parsed.label === 'BTRANS' || parsed.label === 'RTRANS')) {
        i++;
        continue;
      }

      if (parsed && parsed.label === 'TRANS') {
        // Expected parts: [account, dimensions, amount, ...optional fields]
        // Fortnox: [account, dimensions, amount, "", "", 0]
        // Spiris:  [account, dimensions, amount, date, text]
        
        const account = parsed.parts[0] || '';
        const dimString = parsed.parts[1] || '';
        const amount = parseAmount(parsed.parts[2]);

        // Parse dimensions from dimension string
        let costCenter = '';
        let project = '';
        if (dimString) {
          const dimParts = dimString.split(' ').filter(Boolean);
          for (let d = 0; d < dimParts.length - 1; d += 2) {
            const dimType = dimParts[d];
            const dimValue = dimParts[d + 1];
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
        const meaningfulParts = remainingParts.filter(p => {
          // Remove empty strings (Fortnox empty fields)
          if (!p || p === '') return false;
          // Remove small integers that are likely quantity fields (e.g., "0")
          if (/^\d+$/.test(p) && parseInt(p, 10) <= 100) return false;
          return true;
        });

        // Process meaningful parts
        if (meaningfulParts.length > 0) {
          const firstPart = meaningfulParts[0];
          
          // Check if first meaningful part is a date (YYYYMMDD = 8 digits)
          if (/^\d{8}$/.test(firstPart)) {
            // Spiris format: has explicit date
            dateStr = firstPart;
            // Second meaningful part would be text
            if (meaningfulParts.length > 1) {
              textStr = meaningfulParts[1];
            }
          } else {
            // First part is text, not a date
            textStr = firstPart;
            // Date stays as defaultDate from VER header
          }
        }
        // If no meaningful parts, use defaults from VER header

        // Extract quantity from field 6 (parts[5]) if present
        const quantity = parsed.parts[5] ? parseAmount(parsed.parts[5]) : undefined;

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
          quantity: quantity !== 0 ? quantity : undefined, // Only include if non-zero
          registrationDate: registrationDate || undefined, // From VER field 5
        });
      }
      i++;
    }
  }

  return { endIndex: i, transactions };
}

/**
 * Parse SIE file content
 * Note: Content should already be decoded to UTF-8 string before calling this function
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
  const accountTaxCodes: Map<string, string> = new Map(); // Store SRU codes temporarily
  const dimensions: SIEDimension[] = [];
  const transactions: SIETransaction[] = [];
  const balances: SIEBalance[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
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
        // Organization number: #ORGNR 559425-2511
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
        // Indicates the date of the last transaction in the file
        // Used to determine actual period length for partial-year files
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
            accountGroup: ACCOUNT_GROUPS[accountNumber[0]] || '',
            taxCode: accountTaxCodes.get(accountNumber), // Add SRU code if exists
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
        // Opening balance: #IB <year_index> <account_number> <amount> [quantity]
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
        // Closing balance: #UB <year_index> <account_number> <amount> [quantity]
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
        // Result (income statement): #RES <year_index> <account_number> <amount> [quantity]
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

      case 'DIM':
        // Dimension definition: #DIM 1 Kostnadsställe
        // Just note the dimension type name (not stored separately)
        break;

      case 'OBJEKT':
        // Dimension object: #OBJEKT 1 100 "Avdelning A"
        if (parts[0] && parts[1]) {
          dimensions.push({
            dimensionType: parseInt(parts[0], 10),
            code: parts[1],
            name: parts[2] || parts[1],
          });
        }
        break;

      case 'VER':
        // Verification header
        // Fortnox: #VER L 15 20250523 "Löneutbetalning..." 20250522
        // Spiris:  #VER A 1 20251101 "Månadsavgift..." 20251125
        const verSeries = parts[0] || '';
        const verNumber = parts[1] || '';
        const verDate = parts[2] || '';
        const verText = parts[3] || '';
        const verRegistrationDate = parts[4] || undefined; // Optional registration date (field 5)

        const { endIndex, transactions: verTrans } = parseVerificationBlock(
          lines, i, verText, verDate, verSeries, verNumber, verRegistrationDate
        );

        transactions.push(...verTrans);
        i = endIndex;
        break;
    }
  }

  // Update accounts with SRU codes that were parsed after KONTO lines
  // (In case SRU appears after KONTO in the file)
  accounts.forEach(account => {
    if (!account.taxCode && accountTaxCodes.has(account.accountNumber)) {
      account.taxCode = accountTaxCodes.get(account.accountNumber);
    }
  });

  return { metadata, accounts, dimensions, transactions, balances };
}

/**
 * Decode SIE file buffer with proper encoding detection
 * Handles CP437 (DOS/Fortnox), Latin-1, and UTF-8
 */
export function decodeSIEBuffer(buffer: Buffer, encoding?: string): string {
  // Explicit CP437 (Fortnox default for Swedish chars: å=86, ä=84, ö=94)
  if (encoding === 'cp437' || encoding === 'CP437') {
    return iconv.decode(buffer, 'cp437');
  }

  // UTF-8 BOM detection
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8').slice(1);
  }

  // Default to CP437 for Fortnox files (most common)
  return iconv.decode(buffer, 'cp437');
}
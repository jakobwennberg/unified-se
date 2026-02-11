/**
 * Company Generator Service
 *
 * Uses LangChain + AWS Bedrock to generate a realistic Swedish company
 * as a SIE file. Two-phase architecture:
 *   1. AI generates a "financial blueprint" (single LLM call)
 *   2. Deterministic expansion into balanced SIE data (no LLM)
 */
import { z } from 'zod';
import { ChatBedrockConverse } from '@langchain/aws';
import type {
  GenerateCompanyRequest,
  GenerateCompanyResult,
  CompanyIndustry,
  CompanySize,
} from '@arcim-sync/core';
import { writeSIE, calculateKPIs } from '@arcim-sync/core/sie';
import type { AIConfig } from '../ai/config.js';
import {
  expandBlueprintToSIE,
  type CompanyBlueprint,
} from './blueprint-expander.js';
import { formatIndustryRulesForPrompt, INDUSTRY_RULES } from './industry-rules.js';

// ---- Zod schema for structured output (blueprint) ----

const BlueprintAccountSchema = z.object({
  number: z.string().describe('BAS account number (4 digits, e.g. "1930")'),
  name: z.string().describe('Swedish account name (e.g. "Företagskonto")'),
});

const BlueprintBalanceSchema = z.object({
  accountNumber: z.string().describe('Account number'),
  amount: z
    .number()
    .describe(
      'Opening balance amount. Assets positive, liabilities/equity NEGATIVE.',
    ),
});

const BlueprintTransactionTemplateSchema = z.object({
  description: z
    .string()
    .describe('Short Swedish description (e.g. "Månadshyra")'),
  debitAccount: z.string().describe('Account to debit (4 digits)'),
  creditAccount: z.string().describe('Account to credit (4 digits)'),
  monthlyAmount: z
    .number()
    .positive()
    .describe('Average monthly amount in SEK (positive)'),
  variance: z
    .number()
    .min(0)
    .max(0.5)
    .describe('Random variance fraction (e.g. 0.1 = ±10%)'),
  months: z
    .array(z.number().min(1).max(12))
    .optional()
    .describe('Which months to generate (1-12). Omit for all 12 months.'),
  monthlyCount: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe('How many transactions per month. Default 1. Revenue: 5-15, COGS: 3-8, fixed costs: 1.'),
  datePattern: z
    .enum(['first', 'mid', 'salary', 'tax', 'spread', 'end'])
    .optional()
    .describe('Date pattern: first=1st, salary=25th, tax=12th, spread=across month, mid=10-24th, end=28-31st'),
  vatRate: z
    .number()
    .optional()
    .describe('VAT rate (0, 6, 12, or 25). 0 or omit = no VAT lines. Revenue: use industry rate. Expenses with VAT: 25%.'),
  descriptionPattern: z
    .string()
    .optional()
    .describe('Description pattern with {month}, {n}, {ver} placeholders for varied descriptions.'),
});

const CompanyBlueprintSchema = z.object({
  profile: z.object({
    companyName: z
      .string()
      .describe('Realistic Swedish company name (e.g. "Nordström Konsult AB")'),
    orgNumber: z
      .string()
      .describe('Swedish org number in format XXXXXX-XXXX'),
    industry: z.string().describe('Industry category'),
    size: z.string().describe('Company size: micro, small, or medium'),
    description: z
      .string()
      .describe('One-sentence company description in Swedish'),
  }),
  accounts: z
    .array(BlueprintAccountSchema)
    .describe('15-40 BAS accounts appropriate for this company'),
  openingBalances: z
    .array(BlueprintBalanceSchema)
    .describe(
      'Opening balances for balance sheet accounts (class 1-2). Assets positive, liabilities/equity NEGATIVE.',
    ),
  transactionTemplates: z
    .array(BlueprintTransactionTemplateSchema)
    .describe(
      '10-30 recurring transaction templates covering revenue, costs, salaries, rent, etc.',
    ),
  annualFinancials: z.object({
    totalRevenue: z.number().describe('Expected total annual revenue (positive)'),
    totalCOGS: z.number().describe('Total cost of goods sold (positive)'),
    totalOperatingExpenses: z
      .number()
      .describe('Total operating expenses excl. COGS and personnel (positive)'),
    totalPersonnelCosts: z.number().describe('Total personnel costs (positive)'),
    totalFinancialItems: z
      .number()
      .describe('Net financial items (negative = net expense)'),
    taxAmount: z.number().describe('Corporate tax amount (positive)'),
  }),
  previousYearMultiplier: z
    .number()
    .optional()
    .describe(
      'Multiplier for previous year (e.g. 0.85 = company grew 18% YoY). Omit to skip previous year.',
    ),
});

// ---- Few-shot example ----

const FEW_SHOT_EXAMPLE = `
EXAMPLE — Small consulting company (for reference, adapt to your industry/size):
{
  "profile": {
    "companyName": "Eriksson Konsult AB",
    "orgNumber": "559312-4567",
    "industry": "consulting",
    "size": "small",
    "description": "IT-konsultföretag specialiserat på systemutveckling och projektledning"
  },
  "accounts": [
    {"number": "1220", "name": "Inventarier och verktyg"},
    {"number": "1229", "name": "Ack. avskrivningar inventarier"},
    {"number": "1510", "name": "Kundfordringar"},
    {"number": "1650", "name": "Ingående moms"},
    {"number": "1930", "name": "Företagskonto"},
    {"number": "2081", "name": "Aktiekapital"},
    {"number": "2091", "name": "Balanserat resultat"},
    {"number": "2440", "name": "Leverantörsskulder"},
    {"number": "2510", "name": "Skatteskulder"},
    {"number": "2611", "name": "Utgående moms 25%"},
    {"number": "2710", "name": "Personalens källskatt"},
    {"number": "2730", "name": "Lagstadgade sociala avgifter"},
    {"number": "2920", "name": "Upplupna semesterlöner"},
    {"number": "3010", "name": "Försäljning tjänster"},
    {"number": "5010", "name": "Lokalhyra"},
    {"number": "6110", "name": "Kontorsmateriel"},
    {"number": "6210", "name": "Telefon och internet"},
    {"number": "6250", "name": "IT-tjänster och licenser"},
    {"number": "6310", "name": "Företagsförsäkringar"},
    {"number": "6530", "name": "Redovisningstjänster"},
    {"number": "6570", "name": "Bankkostnader"},
    {"number": "7210", "name": "Löner tjänstemän"},
    {"number": "7411", "name": "Pensionsförsäkringar"},
    {"number": "7510", "name": "Lagstadgade sociala avgifter"},
    {"number": "7830", "name": "Avskrivningar inventarier"},
    {"number": "8910", "name": "Skatt på årets resultat"}
  ],
  "openingBalances": [
    {"accountNumber": "1220", "amount": 120000},
    {"accountNumber": "1229", "amount": -48000},
    {"accountNumber": "1510", "amount": 520000},
    {"accountNumber": "1930", "amount": 685000},
    {"accountNumber": "2081", "amount": -50000},
    {"accountNumber": "2091", "amount": -780000},
    {"accountNumber": "2440", "amount": -45000},
    {"accountNumber": "2510", "amount": -32000},
    {"accountNumber": "2611", "amount": -87500},
    {"accountNumber": "2710", "amount": -39000},
    {"accountNumber": "2730", "amount": -40800},
    {"accountNumber": "2920", "amount": -202700}
  ],
  "transactionTemplates": [
    {"description": "Konsultintäkter", "debitAccount": "1930", "creditAccount": "3010", "monthlyAmount": 433000, "variance": 0.15, "monthlyCount": 8, "datePattern": "spread", "vatRate": 25},
    {"description": "Löner", "debitAccount": "7210", "creditAccount": "1930", "monthlyAmount": 130000, "variance": 0.02, "datePattern": "salary"},
    {"description": "Lokalhyra", "debitAccount": "5010", "creditAccount": "1930", "monthlyAmount": 12000, "variance": 0, "datePattern": "first", "vatRate": 25},
    {"description": "IT-licenser", "debitAccount": "6250", "creditAccount": "1930", "monthlyAmount": 4500, "variance": 0.1, "datePattern": "first", "vatRate": 25},
    {"description": "Redovisning", "debitAccount": "6530", "creditAccount": "1930", "monthlyAmount": 5500, "variance": 0.05, "datePattern": "mid", "vatRate": 25},
    {"description": "Försäkring", "debitAccount": "6310", "creditAccount": "1930", "monthlyAmount": 1800, "variance": 0, "datePattern": "first"},
    {"description": "Telefon", "debitAccount": "6210", "creditAccount": "1930", "monthlyAmount": 1200, "variance": 0.1, "datePattern": "mid", "vatRate": 25},
    {"description": "Bankkostnader", "debitAccount": "6570", "creditAccount": "1930", "monthlyAmount": 450, "variance": 0.15, "datePattern": "end"},
    {"description": "Kontorsmateriel", "debitAccount": "6110", "creditAccount": "1930", "monthlyAmount": 800, "variance": 0.3, "datePattern": "mid", "vatRate": 25},
    {"description": "Avskrivningar", "debitAccount": "7830", "creditAccount": "1229", "monthlyAmount": 2000, "variance": 0, "datePattern": "end"},
    {"description": "Preliminärskatt", "debitAccount": "8910", "creditAccount": "1930", "monthlyAmount": 14200, "variance": 0, "datePattern": "tax"}
  ],
  "annualFinancials": {
    "totalRevenue": 5200000,
    "totalCOGS": 0,
    "totalOperatingExpenses": 312000,
    "totalPersonnelCosts": 2370000,
    "totalFinancialItems": -5000,
    "taxAmount": 170000
  },
  "previousYearMultiplier": 0.88
}`;

// ---- Prompt ----

function buildPrompt(request: GenerateCompanyRequest): string {
  const industry = request.industry;
  const size = request.size ?? 'small';
  const fiscalYear = request.fiscalYear ?? new Date().getFullYear() - 1;
  const includePrev = request.includePreviousYear !== false;

  // Industry-specific rules block
  const industryBlock = industry
    ? formatIndustryRulesForPrompt(industry)
    : `Pick a random Swedish industry from: ${Object.keys(INDUSTRY_RULES).join(', ')}. Then follow the financial ratios typical for that industry.`;

  // Share capital by size
  const shareCapital =
    size === 'micro' ? '25,000' : size === 'small' ? '50,000' : '100,000';

  return `Generate a realistic fictional Swedish company for accounting demonstration purposes.

${industryBlock}

Company size: ${size}
- micro: 1-3 employees, <3M SEK annual revenue
- small: 4-15 employees, 3-20M SEK annual revenue
- medium: 16-50 employees, 20-100M SEK annual revenue
Fiscal year: ${fiscalYear}
${includePrev ? 'Include previous year data (set previousYearMultiplier between 0.7 and 1.1).' : 'No previous year data needed.'}

═══════════════════════════════════════════
FINANCIAL RULES — YOU MUST FOLLOW THESE
═══════════════════════════════════════════

1. REVENUE & MARGINS
   - Total revenue, COGS, personnel, and operating expenses MUST hit the industry targets above.
   - annualFinancials.totalRevenue must fall within the size range.
   - annualFinancials.totalCOGS / totalRevenue must be within the COGS% range.
   - annualFinancials.totalPersonnelCosts / totalRevenue must be within the Personnel% range.
   - The resulting operating margin and net margin must land in the target ranges.
   - Sum of (monthly transaction amounts × active months) must roughly match annualFinancials.

2. SWEDISH ACCOUNTING FUNDAMENTALS
   - Share capital (2081): ${shareCapital} SEK (NEGATIVE in opening balance)
   - Retained earnings (2091): accumulated prior-year profits (NEGATIVE)
   - Swedish corporate tax: 20.6% of profit before tax → taxAmount in annualFinancials
   - Salary ranges per month: micro CEO 25,000-40,000 SEK; small employees 30,000-55,000; medium 30,000-65,000
   - IMPORTANT: Only include ONE salary template (debit 7210, credit 1930) with the total gross salary for all employees.
     The expander will automatically generate social security (7510), pension (7411), PAYE withholding (2710),
     and social security liability (2730) from the salary template. Do NOT add separate templates for these.
   - VAT: Set vatRate on revenue and expense templates. ${industry ? INDUSTRY_RULES[industry].vatRate : 25}% for sales.
     25% for most expenses. 0 for salary, depreciation, tax, insurance, bank fees.

3. BALANCE SHEET — OPENING BALANCES (class 1-2)
   - CRITICAL: Opening balance sheet MUST balance. Sum of all IB amounts = 0 (assets positive + equity/liabilities negative = 0).
   - Bank (1930): This is the PLUG figure. Compute it as: Bank = -(sum of all other IB amounts). It MUST make the balance sheet sum to zero.
     Guideline: typically 5-15% of annual revenue.
   - Accounts receivable (1510): ${industry ? (INDUSTRY_RULES[industry].salesModel === 'b2b' ? '8-15% of revenue (static opening balance — represents steady-state outstanding invoices)' : INDUSTRY_RULES[industry].salesModel === 'b2c' ? '0-2% of revenue (mostly cash/card sales)' : '4-10% of revenue') : 'Depends on sales model (B2B: 8-15%, B2C: 0-2%)'}
   - Inventory (1400s): Only if industry has inventory — 10-30% of annual COGS
   - Fixed assets: If applicable, include acquisition value (e.g. 1220) and accumulated depreciation (1229, NEGATIVE)
   - Equity (2081 + 2091): Share capital + retained earnings, both NEGATIVE

   CURRENT LIABILITIES — You MUST include ALL of the following in opening balances (all NEGATIVE):
   - Accounts payable (2440): 5-20% of annual COGS — represents unpaid supplier invoices
   - VAT liability (2611): ~1 month of net output VAT ≈ monthlyRevenue × ${industry ? INDUSTRY_RULES[industry].vatRate : 25}% (revenue × vatRate / 100 / 12), NEGATIVE
   - PAYE withholding (2710): ~30% of one month's gross salaries, NEGATIVE
   - Social security liability (2730): ~31.42% of one month's gross salaries, NEGATIVE
   - Accrued vacation pay (2920): ~12% of annual gross salary cost, NEGATIVE
   - Tax liability (2510): ~2 months of corporate tax (taxAmount / 6), NEGATIVE

   ⚠️ CURRENT RATIO CHECK: currentAssets (accounts 1400-1999) ÷ currentLiabilities (accounts 2400-2999) MUST be between 1.2 and 2.5.
   A healthy Swedish company typically has current ratio 1.3-2.0. If your numbers yield > 3.0, you have too few current liabilities — add more or increase their amounts.

   - IMPORTANT: The bank (1930) ending balance = IB + total annual revenue - total annual costs.
     You MUST ensure this remains positive. If the company is profitable, this happens naturally.
     If unprofitable, increase the opening bank balance to cover the loss.

4. EXPENSE CATEGORIES — CONCRETE SEK RANGES
   Use these monthly ranges when building transaction templates:
   - Rent (5010): micro 2,000-8,000, small 5,000-20,000, medium 15,000-50,000 SEK/month
   - Accounting services (6530): 2,000-8,000 SEK/month
   - Insurance (6310): 500-3,000 SEK/month
   - IT/software (6250): 500-5,000 SEK/month
   - Bank fees (6570): 200-3,500 SEK/month
   - Telecom (6210): 500-2,000 SEK/month
   - Office supplies (6110): 200-2,000 SEK/month

5. DEPRECIATION (if fixed assets exist)
   - Equipment: 20% per year (5-year straight-line)
   - Transaction template: debit 7830 "Avskrivningar", credit 1229 "Ack. avskrivningar inventarier"
   - Monthly amount = annual depreciation / 12

6. ACCOUNT NUMBERING (BAS Kontoplan)
   - Class 1 (1000-1999): Assets → POSITIVE opening balances
   - Class 2 (2000-2999): Equity & Liabilities → NEGATIVE opening balances
   - Class 3 (3000-3999): Revenue (credited in transactions)
   - Class 4 (4000-4999): Cost of goods sold
   - Class 5-6 (5000-6999): Operating expenses
   - Class 7 (7000-7999): Personnel costs + depreciation
   - Class 8 (8000-8999): Financial items + tax
   - Required accounts: 1930 (bank), 2081 (aktiekapital), 2091 (balanserat resultat), 2440 (leverantörsskulder), 2611 (utgående moms), 2710 (personalens källskatt), 2730 (lagstadgade sociala avgifter), 2920 (upplupna semesterlöner), main revenue (3010-3051)

7. TRANSACTION TEMPLATES
   - Must cover ALL revenue and ALL expense categories.
   - CRITICAL: ALL templates must flow through the bank account (1930) so cash balances stay realistic.
     Do NOT use 1510 (AR) or 2440 (AP) in transaction templates — those are static opening balance items only.
   - Revenue templates: debit 1930 (bank), credit the revenue account (3xxx). Set vatRate to industry VAT rate.
     Set monthlyCount to 5-15 (B2B: 5-8, B2C: 8-15). Set datePattern to "spread".
   - COGS templates: debit 4xxx, credit 1930 (bank). Set vatRate to 25. Set monthlyCount to 3-8. Set datePattern to "spread".
   - Salary template: debit 7210 "Löner", credit 1930. Only ONE template for total gross salary.
     Set datePattern to "salary". Do NOT set vatRate. The expander handles social security, pension, and withholding automatically.
   - Rent: set datePattern to "first". Set vatRate to 25.
   - Insurance: set datePattern to "first". No VAT (vatRate 0 or omit).
   - IT/subscriptions: set datePattern to "first". Set vatRate to 25.
   - Bank fees: set datePattern to "end". No VAT.
   - Accounting: set datePattern to "mid". Set vatRate to 25.
   - Tax template: debit 8910, credit 1930 (amount = taxAmount / 12 per month). Set datePattern to "tax". No VAT.
   - Depreciation: debit 7830, credit 1229. Set datePattern to "end". No VAT. variance 0.

GENERAL:
- Company name: realistic Swedish (e.g. "Berglund & Partners AB", "Västkusten Bygg AB")
- Organization number: 6 digits, dash, 4 digits (e.g. "559284-1234")
- The company should be healthy but not perfect — small imperfections are realistic.

${FEW_SHOT_EXAMPLE}

Return ONLY the structured JSON. Do not include any explanation.`;
}

// ---- Blueprint validation & auto-correction ----

function validateAndFixBlueprint(blueprint: CompanyBlueprint): void {
  // 1. Ensure all account numbers are valid 4-digit BAS numbers
  blueprint.accounts = blueprint.accounts.filter((a) => {
    const num = parseInt(a.number, 10);
    return num >= 1000 && num <= 8999 && a.number.length === 4;
  });

  // 2. Remove income statement accounts from opening balances
  blueprint.openingBalances = blueprint.openingBalances.filter((ob) => {
    const num = parseInt(ob.accountNumber, 10);
    return num >= 1000 && num <= 2999;
  });

  // 3. Ensure opening balance sheet sums to zero (fix bank as plug)
  let sumExcludingBank = 0;
  let bankEntry: (typeof blueprint.openingBalances)[number] | undefined;
  for (const ob of blueprint.openingBalances) {
    if (ob.accountNumber === '1930') {
      bankEntry = ob;
    } else {
      sumExcludingBank += ob.amount;
    }
  }

  if (bankEntry) {
    // Fix bank to make balance sheet sum to zero
    bankEntry.amount = -sumExcludingBank;
  } else if (sumExcludingBank !== 0) {
    // Add bank entry as plug
    blueprint.openingBalances.push({
      accountNumber: '1930',
      amount: -sumExcludingBank,
    });
  }

  // 4. Ensure required accounts exist
  const requiredAccounts = [
    { number: '1930', name: 'Företagskonto' },
    { number: '2081', name: 'Aktiekapital' },
    { number: '2091', name: 'Balanserat resultat' },
  ];

  for (const req of requiredAccounts) {
    if (!blueprint.accounts.some((a) => a.number === req.number)) {
      blueprint.accounts.push(req);
    }
  }

  // 5. Remove duplicate salary-related templates if AI added social security/pension separately
  // The expander now handles these automatically from the salary template
  const hasSalaryTemplate = blueprint.transactionTemplates.some(
    (t) => parseInt(t.debitAccount, 10) >= 7200 && parseInt(t.debitAccount, 10) < 7300,
  );

  if (hasSalaryTemplate) {
    blueprint.transactionTemplates = blueprint.transactionTemplates.filter((t) => {
      const debit = parseInt(t.debitAccount, 10);
      // Remove separate social security (7510) and pension (7411) templates
      // since the expander generates these from the salary template
      if (debit === 7510 || debit === 7411) return false;
      return true;
    });
  }
}

// ---- Service ----

export class CompanyGenerator {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generate(
    request: GenerateCompanyRequest,
  ): Promise<GenerateCompanyResult> {
    const llm = new ChatBedrockConverse({
      model: this.config.bedrockModelId,
      region: this.config.awsRegion,
      credentials: {
        accessKeyId: this.config.awsAccessKeyId!,
        secretAccessKey: this.config.awsSecretAccessKey!,
      },
      maxTokens: this.config.bedrockMaxTokens,
      temperature: 0.7,
    });

    const structuredLlm = llm.withStructuredOutput(CompanyBlueprintSchema, {
      name: 'CompanyBlueprint',
    });

    const prompt = buildPrompt(request);
    const blueprint: CompanyBlueprint = await structuredLlm.invoke(prompt);

    // Override industry/size from request if specified
    if (request.industry) {
      blueprint.profile.industry = request.industry;
    }
    if (request.size) {
      blueprint.profile.size = request.size;
    }

    // Validate and auto-correct the blueprint
    validateAndFixBlueprint(blueprint);

    // Phase 2: Deterministic expansion
    const sieData = expandBlueprintToSIE(blueprint, request);
    const sieText = writeSIE(sieData);
    const kpis = calculateKPIs(sieData);

    return {
      profile: {
        companyName: blueprint.profile.companyName,
        orgNumber: blueprint.profile.orgNumber,
        industry: (request.industry ?? blueprint.profile.industry) as CompanyIndustry,
        size: (request.size ?? blueprint.profile.size) as CompanySize,
        description: blueprint.profile.description,
      },
      sieData,
      sieText,
      kpis,
    };
  }
}

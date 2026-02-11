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

// ---- Prompt ----

function buildPrompt(request: GenerateCompanyRequest): string {
  const industry = request.industry ? `Industry: ${request.industry}` : 'Pick a random Swedish industry';
  const size = request.size ?? 'small';
  const fiscalYear = request.fiscalYear ?? new Date().getFullYear() - 1;
  const includePrev = request.includePreviousYear !== false;

  return `Generate a realistic fictional Swedish company for accounting demonstration purposes.

${industry}
Company size: ${size} (micro = 1-3 employees / <3M SEK revenue, small = 4-15 employees / 3-20M SEK, medium = 16-50 employees / 20-100M SEK)
Fiscal year: ${fiscalYear}
${includePrev ? 'Include previous year data (set previousYearMultiplier between 0.7 and 1.1)' : 'No previous year data needed'}

Requirements:
- Company name should be realistic Swedish (e.g. "Berglund & Partners AB", "Västkusten Bygg AB")
- Organization number in valid format: 6 digits, dash, 4 digits (e.g. "559284-1234")
- Use standard BAS (Baskontoplan) account numbers:
  * Class 1 (1000-1999): Assets (positive balances)
  * Class 2 (2000-2999): Equity & liabilities (NEGATIVE balances for IB)
  * Class 3 (3000-3999): Revenue accounts
  * Class 4 (4000-4999): Cost of goods sold
  * Class 5-6 (5000-6999): Operating expenses
  * Class 7 (7000-7999): Personnel costs, depreciation
  * Class 8 (8000-8999): Financial items, tax
- Include at minimum: 1930 (bank), 1510 (kundfordringar), 2081 (aktiekapital), 2091 (balanserat resultat), 2440 (leverantörsskulder), main revenue account (3010-3051), relevant expense accounts
- Transaction templates should cover ALL revenue and expense categories. Each template generates one verification per month.
- Monthly amounts should add up to annual financials roughly (monthly × 12 ≈ annual)
- Opening balances must include at least: bank (1930), equity accounts (2081, 2091), and receivables/payables if used
- The company should have a healthy but realistic financial profile — not perfect, not failing

Return ONLY the structured JSON. Do not include any explanation.`;
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

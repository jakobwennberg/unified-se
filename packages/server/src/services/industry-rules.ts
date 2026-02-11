/**
 * Industry-specific financial rules for realistic SIE company generation.
 *
 * Derived from analysis of real Swedish SIE files (Vivona, Klippster,
 * NearbyStore, Arcim) — COGS ratios, personnel costs, margins, etc.
 */
import type { CompanyIndustry } from '@arcim-sync/core';

export interface IndustryRules {
  name: string;
  cogsPercentOfRevenue: [min: number, max: number];
  grossMarginTarget: [min: number, max: number];
  operatingMarginTarget: [min: number, max: number];
  netMarginTarget: [min: number, max: number];
  personnelCostPercentOfRevenue: [min: number, max: number];
  rentPercentOfRevenue: [min: number, max: number];
  hasInventory: boolean;
  salesModel: 'b2b' | 'b2c' | 'mixed';
  vatRate: 25 | 12 | 6;
  /** Monthly revenue multipliers (Jan–Dec). Should average ~1.0. Applied to revenue & COGS templates. */
  seasonalMultipliers: [number, number, number, number, number, number, number, number, number, number, number, number];
  typicalExpenseCategories: string[];
  notes: string;
}

export const INDUSTRY_RULES: Record<CompanyIndustry, IndustryRules> = {
  consulting: {
    name: 'Consulting / Professional Services',
    cogsPercentOfRevenue: [0, 15],
    grossMarginTarget: [85, 100],
    operatingMarginTarget: [15, 35],
    netMarginTarget: [10, 25],
    personnelCostPercentOfRevenue: [40, 60],
    rentPercentOfRevenue: [1, 3],
    hasInventory: false,
    salesModel: 'b2b',
    vatRate: 25,
    seasonalMultipliers: [0.95, 0.95, 1.05, 1.05, 1.10, 1.00, 0.30, 0.85, 1.05, 1.10, 1.20, 1.40],
    typicalExpenseCategories: [
      '5010 Lokalhyra (office rent)',
      '5410 Förbrukningsinventarier (consumables)',
      '5910 Annonsering (advertising)',
      '6110 Kontorsmateriel (office supplies)',
      '6210 Telefon & internet',
      '6250 IT-tjänster / licensavgifter (SaaS tools)',
      '6310 Företagsförsäkringar (insurance)',
      '6530 Redovisningstjänster (accounting services)',
      '6570 Bankkostnader (bank fees)',
      '6970 Tidningar & facklitteratur',
    ],
    notes:
      'Very low or zero COGS. Revenue is almost entirely from consulting hours. Sub-contractors (4010) may appear as COGS for firms that outsource delivery.',
  },
  retail: {
    name: 'Retail / E-commerce',
    cogsPercentOfRevenue: [55, 75],
    grossMarginTarget: [25, 45],
    operatingMarginTarget: [3, 12],
    netMarginTarget: [2, 8],
    personnelCostPercentOfRevenue: [10, 25],
    rentPercentOfRevenue: [3, 8],
    hasInventory: true,
    salesModel: 'b2c',
    vatRate: 25,
    seasonalMultipliers: [0.75, 0.85, 0.90, 0.95, 1.00, 0.95, 0.85, 0.90, 0.95, 1.05, 1.35, 1.50],
    typicalExpenseCategories: [
      '4010 Inköp varor (purchased goods)',
      '5010 Lokalhyra (shop rent)',
      '5020 El & uppvärmning (utilities)',
      '5410 Förbrukningsinventarier',
      '5910 Annonsering & marknadsföring',
      '6110 Kontorsmateriel',
      '6210 Telefon & internet',
      '6310 Företagsförsäkringar',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
      '6590 Övriga externa tjänster',
    ],
    notes:
      'High COGS from purchased goods. Inventory (1400s) typically 10-30% of annual COGS. B2C means minimal accounts receivable (1510). Seasonal variance is common.',
  },
  manufacturing: {
    name: 'Manufacturing',
    cogsPercentOfRevenue: [40, 60],
    grossMarginTarget: [40, 60],
    operatingMarginTarget: [8, 20],
    netMarginTarget: [5, 15],
    personnelCostPercentOfRevenue: [20, 35],
    rentPercentOfRevenue: [2, 5],
    hasInventory: true,
    salesModel: 'b2b',
    vatRate: 25,
    seasonalMultipliers: [0.85, 0.90, 1.00, 1.10, 1.10, 1.10, 0.60, 0.85, 1.05, 1.10, 1.15, 1.20],
    typicalExpenseCategories: [
      '4010 Inköp råmaterial (raw materials)',
      '5010 Lokalhyra (factory/warehouse)',
      '5020 El & uppvärmning',
      '5410 Förbrukningsinventarier & verktyg',
      '5610 Reparation & underhåll (maintenance)',
      '6110 Kontorsmateriel',
      '6210 Telefon & internet',
      '6310 Företagsförsäkringar',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
      '7830 Avskrivningar maskiner & inventarier',
    ],
    notes:
      'Significant fixed assets (machinery). Depreciation is material. Inventory includes raw materials (1410), WIP (1440), and finished goods (1460). B2B with 30-60 day payment terms.',
  },
  restaurant: {
    name: 'Restaurant / Food Service',
    cogsPercentOfRevenue: [25, 40],
    grossMarginTarget: [60, 75],
    operatingMarginTarget: [3, 12],
    netMarginTarget: [1, 8],
    personnelCostPercentOfRevenue: [30, 45],
    rentPercentOfRevenue: [5, 10],
    hasInventory: true,
    salesModel: 'b2c',
    vatRate: 12,
    seasonalMultipliers: [0.75, 0.75, 0.85, 0.95, 1.05, 1.20, 1.25, 1.15, 1.00, 0.95, 0.95, 1.15],
    typicalExpenseCategories: [
      '4010 Inköp livsmedel (food purchases)',
      '4020 Inköp drycker (beverages)',
      '5010 Lokalhyra (restaurant premises)',
      '5020 El & uppvärmning',
      '5060 Städning & renhållning (cleaning)',
      '5410 Förbrukningsinventarier',
      '6110 Kontorsmateriel',
      '6210 Telefon & internet',
      '6310 Företagsförsäkringar',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
    ],
    notes:
      'Food VAT is 12%. High personnel costs (waitstaff, kitchen). Inventory is perishable and small. Very low AR — mostly cash/card B2C sales. Rent is a major cost.',
  },
  construction: {
    name: 'Construction / Building',
    cogsPercentOfRevenue: [50, 70],
    grossMarginTarget: [30, 50],
    operatingMarginTarget: [5, 15],
    netMarginTarget: [3, 10],
    personnelCostPercentOfRevenue: [20, 35],
    rentPercentOfRevenue: [1, 3],
    hasInventory: false,
    salesModel: 'b2b',
    vatRate: 25,
    seasonalMultipliers: [0.50, 0.60, 0.80, 1.10, 1.25, 1.30, 1.20, 1.20, 1.10, 1.00, 0.55, 0.40],
    typicalExpenseCategories: [
      '4010 Inköp material (building materials)',
      '4050 Underentreprenörer (subcontractors)',
      '5010 Lokalhyra (office/storage)',
      '5060 Arbetsplatskostnader (site costs)',
      '5410 Förbrukningsinventarier & verktyg',
      '5610 Reparation & underhåll (vehicle/equipment)',
      '6210 Telefon & internet',
      '6310 Företagsförsäkringar',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
    ],
    notes:
      'COGS dominated by materials + subcontractors. No finished goods inventory (project-based). Large AR balances — B2B with 30-day terms. Vehicle costs (leasing/fuel) are common.',
  },
  saas: {
    name: 'SaaS / Software',
    cogsPercentOfRevenue: [5, 20],
    grossMarginTarget: [80, 95],
    operatingMarginTarget: [5, 30],
    netMarginTarget: [3, 25],
    personnelCostPercentOfRevenue: [35, 55],
    rentPercentOfRevenue: [1, 3],
    hasInventory: false,
    salesModel: 'mixed',
    vatRate: 25,
    seasonalMultipliers: [0.90, 0.90, 1.00, 1.00, 1.05, 1.00, 0.80, 0.90, 1.05, 1.10, 1.15, 1.15],
    typicalExpenseCategories: [
      '4010 Serverdrift & hosting (cloud costs)',
      '5010 Lokalhyra (office)',
      '5410 Förbrukningsinventarier (hardware)',
      '5910 Annonsering & marknadsföring',
      '6110 Kontorsmateriel',
      '6210 Telefon & internet',
      '6250 IT-tjänster / licensavgifter',
      '6310 Företagsförsäkringar',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
    ],
    notes:
      'COGS is primarily server/cloud costs. Very high gross margin. Personnel is the dominant expense. Mixed B2B/B2C — B2B has AR, B2C has little. Marketing spend can be high for growth-stage companies.',
  },
  healthcare: {
    name: 'Healthcare / Medical',
    cogsPercentOfRevenue: [10, 30],
    grossMarginTarget: [70, 90],
    operatingMarginTarget: [8, 25],
    netMarginTarget: [5, 20],
    personnelCostPercentOfRevenue: [45, 65],
    rentPercentOfRevenue: [3, 8],
    hasInventory: false,
    salesModel: 'mixed',
    vatRate: 25,
    seasonalMultipliers: [0.95, 0.90, 0.95, 1.00, 1.00, 1.05, 0.85, 0.90, 1.05, 1.10, 1.10, 1.15],
    typicalExpenseCategories: [
      '4010 Inköp material & förbrukningsvaror',
      '5010 Lokalhyra (clinic/practice)',
      '5020 El & uppvärmning',
      '5410 Förbrukningsinventarier (medical supplies)',
      '6110 Kontorsmateriel',
      '6210 Telefon & internet',
      '6250 IT-system / journalsystem',
      '6310 Företagsförsäkringar (incl. patient insurance)',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
    ],
    notes:
      'Healthcare services are VAT-exempt (sjukvård), but many private clinics charge 25% VAT for non-exempt services. Very high personnel share. Rent for clinical premises is significant.',
  },
  transport: {
    name: 'Transport / Logistics',
    cogsPercentOfRevenue: [40, 60],
    grossMarginTarget: [40, 60],
    operatingMarginTarget: [5, 15],
    netMarginTarget: [3, 10],
    personnelCostPercentOfRevenue: [25, 40],
    rentPercentOfRevenue: [1, 3],
    hasInventory: false,
    salesModel: 'b2b',
    vatRate: 25,
    seasonalMultipliers: [0.85, 0.85, 0.95, 1.05, 1.10, 1.15, 0.90, 1.00, 1.05, 1.10, 1.05, 0.95],
    typicalExpenseCategories: [
      '4010 Drivmedel (fuel)',
      '4020 Fordonskostnader (vehicle costs)',
      '5010 Lokalhyra (depot/office)',
      '5060 Vägavgifter & tullar',
      '5610 Reparation & underhåll fordon',
      '5620 Leasingavgifter fordon',
      '6310 Företagsförsäkringar (fleet insurance)',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
      '7830 Avskrivningar fordon',
    ],
    notes:
      'Fuel + vehicle costs dominate COGS. Significant fixed assets (vehicles) with depreciation. Fleet insurance is a major expense. B2B with standard 30-day terms.',
  },
  real_estate: {
    name: 'Real Estate / Property Management',
    cogsPercentOfRevenue: [5, 20],
    grossMarginTarget: [80, 95],
    operatingMarginTarget: [30, 60],
    netMarginTarget: [15, 40],
    personnelCostPercentOfRevenue: [5, 15],
    rentPercentOfRevenue: [0, 2],
    hasInventory: false,
    salesModel: 'b2b',
    vatRate: 25,
    seasonalMultipliers: [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
    typicalExpenseCategories: [
      '5010 Fastighetsskötsel (property maintenance)',
      '5020 El & uppvärmning fastigheter',
      '5060 Vatten & avlopp',
      '5070 Reparation & underhåll fastigheter',
      '6310 Företagsförsäkringar (property insurance)',
      '6530 Redovisningstjänster',
      '6570 Bankkostnader',
      '8310 Räntekostnader (interest on property loans)',
      '7830 Avskrivningar byggnader',
    ],
    notes:
      'Revenue is rental income (3010). Very low personnel. Significant fixed assets (properties) + depreciation. High financial costs (mortgage interest 8310). Revenue is stable and predictable.',
  },
};

/** Format industry rules as a prompt-friendly text block */
export function formatIndustryRulesForPrompt(industry: CompanyIndustry): string {
  const r = INDUSTRY_RULES[industry];
  return `
INDUSTRY: ${r.name}
- COGS should be ${r.cogsPercentOfRevenue[0]}-${r.cogsPercentOfRevenue[1]}% of revenue
- Gross margin target: ${r.grossMarginTarget[0]}-${r.grossMarginTarget[1]}%
- Operating margin target: ${r.operatingMarginTarget[0]}-${r.operatingMarginTarget[1]}%
- Net margin target: ${r.netMarginTarget[0]}-${r.netMarginTarget[1]}%
- Personnel costs: ${r.personnelCostPercentOfRevenue[0]}-${r.personnelCostPercentOfRevenue[1]}% of revenue
- Rent: ${r.rentPercentOfRevenue[0]}-${r.rentPercentOfRevenue[1]}% of revenue
- Inventory: ${r.hasInventory ? 'Yes — use 1400-series accounts, inventory = 10-30% of annual COGS' : 'No inventory accounts needed'}
- Sales model: ${r.salesModel.toUpperCase()} → ${r.salesModel === 'b2b' ? 'AR (1510) should be 8-15% of annual revenue' : r.salesModel === 'b2c' ? 'AR (1510) should be 0-2% of revenue (mostly cash/card)' : 'AR (1510) should be 4-10% of revenue (mix of invoiced and direct)'}
- Primary VAT rate: ${r.vatRate}%
- Typical expense accounts to include:
${r.typicalExpenseCategories.map((c) => `  * ${c}`).join('\n')}
- Note: ${r.notes}`.trim();
}

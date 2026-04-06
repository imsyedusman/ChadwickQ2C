import prisma from './prisma';

export interface CalculationSettings {
  labourRate: number;
  consumablesPct: number;
  overheadPct: number;
  engineeringPct: number;
  targetMarginPct: number;
  gstPct: number;
  roundingIncrement: number;
  copperPricePerKg: number;
}

export const DEFAULT_SETTINGS: CalculationSettings = {
  labourRate: 100,
  consumablesPct: 0.03,
  overheadPct: 0.20,
  engineeringPct: 0.20,
  targetMarginPct: 0.18,
  gstPct: 0.10,
  roundingIncrement: 100,
  copperPricePerKg: 15.0,
};

/**
 * Fetches global settings with hardcoded fallbacks to ensure calculations never fail.
 */
export async function getGlobalSettings(): Promise<CalculationSettings> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      return DEFAULT_SETTINGS;
    }
    return {
      labourRate: settings.labourRate ?? DEFAULT_SETTINGS.labourRate,
      consumablesPct: settings.consumablesPct ?? DEFAULT_SETTINGS.consumablesPct,
      overheadPct: settings.overheadPct ?? DEFAULT_SETTINGS.overheadPct,
      engineeringPct: settings.engineeringPct ?? DEFAULT_SETTINGS.engineeringPct,
      targetMarginPct: settings.targetMarginPct ?? DEFAULT_SETTINGS.targetMarginPct,
      gstPct: settings.gstPct ?? DEFAULT_SETTINGS.gstPct,
      roundingIncrement: settings.roundingIncrement ?? DEFAULT_SETTINGS.roundingIncrement,
      copperPricePerKg: settings.copperPricePerKg ?? DEFAULT_SETTINGS.copperPricePerKg,
    };
  } catch (error) {
    console.error('Failed to fetch global settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Gets effective settings for a quote, considering overrides and global defaults.
 */
export async function getEffectiveSettingsForQuote(quote: {
  overrideLabourRate?: number | null;
  overrideConsumablesPct?: number | null;
  overrideOverheadPct?: number | null;
  overrideEngineeringPct?: number | null;
  overrideTargetMarginPct?: number | null;
  overrideGstPct?: number | null;
  overrideRoundingIncrement?: number | null;
  overrideCopperPricePerKg?: number | null;
}): Promise<CalculationSettings> {
  const global = await getGlobalSettings();
  
  return {
    labourRate: quote.overrideLabourRate ?? global.labourRate,
    consumablesPct: quote.overrideConsumablesPct ?? global.consumablesPct,
    overheadPct: quote.overrideOverheadPct ?? global.overheadPct,
    engineeringPct: quote.overrideEngineeringPct ?? global.engineeringPct,
    targetMarginPct: quote.overrideTargetMarginPct ?? global.targetMarginPct,
    gstPct: quote.overrideGstPct ?? global.gstPct,
    roundingIncrement: quote.overrideRoundingIncrement ?? global.roundingIncrement,
    copperPricePerKg: quote.overrideCopperPricePerKg ?? global.copperPricePerKg,
  };
}

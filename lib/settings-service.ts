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
 * Gets effective settings for a quote, considering overrides, snapshots, and global defaults.
 * PRIORITY: Overrides > Snapshot > Global Default
 * 
 * @param quote Quote object containing overrides and potentially a settingsSnapshot string
 * @returns {CalculationSettings}
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
  settingsSnapshot?: string | null;
}): Promise<CalculationSettings> {
  const global = await getGlobalSettings();
  
  // 1. Parse Snapshot if it exists
  let snapshot: Partial<CalculationSettings> = {};
  if (quote.settingsSnapshot) {
    try {
      snapshot = JSON.parse(quote.settingsSnapshot);
    } catch (e) {
      console.error(`[Settings Service] Failed to parse snapshot for quote:`, e);
    }
  }

  // 2. Resolve with strict priority: Overrides > Snapshot > Global
  return {
    labourRate: quote.overrideLabourRate ?? snapshot.labourRate ?? global.labourRate,
    consumablesPct: quote.overrideConsumablesPct ?? snapshot.consumablesPct ?? global.consumablesPct,
    overheadPct: quote.overrideOverheadPct ?? snapshot.overheadPct ?? global.overheadPct,
    engineeringPct: quote.overrideEngineeringPct ?? snapshot.engineeringPct ?? global.engineeringPct,
    targetMarginPct: quote.overrideTargetMarginPct ?? snapshot.targetMarginPct ?? global.targetMarginPct,
    gstPct: quote.overrideGstPct ?? snapshot.gstPct ?? global.gstPct,
    roundingIncrement: quote.overrideRoundingIncrement ?? snapshot.roundingIncrement ?? global.roundingIncrement,
    copperPricePerKg: quote.overrideCopperPricePerKg ?? snapshot.copperPricePerKg ?? global.copperPricePerKg,
  };
}

/**
 * Ensures a quote has a settings snapshot. If one doesn't exist, it captures the current global settings.
 * This should be called whenever a quote is created or first "stabilized".
 * 
 * @param quoteId Quote ID to snapshot
 */
export async function ensureQuoteSnapshot(quoteId: string) {
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { settingsSnapshot: true }
    });

    if (!quote || quote.settingsSnapshot) return; // Already snapshotted or doesn't exist

    const global = await getGlobalSettings();
    await prisma.quote.update({
        where: { id: quoteId },
        data: {
            settingsSnapshot: JSON.stringify(global)
        }
    });

    console.log(`[Settings Service] Froze global settings into snapshot for quote ${quoteId}`);
}

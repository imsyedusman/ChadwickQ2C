
export interface MappingMatcher {
  subcategory?: string;
  category?: string;
  name?: string;
}

export interface MappingRule {
  id: string;
  displayText: string;
  matchers: MappingMatcher[];
}

/**
 * CENTRAL MAPPING CONFIGURATION
 * 
 * This defines the rules for automatically adding standardized lines to 
 * quote letter descriptions based on selected items.
 * 
 * Order Matters: The output in the quote letter will follow this specific order.
 */
export const QUOTE_DESCRIPTION_MAPPINGS: MappingRule[] = [
  {
    id: 'surge-diverter',
    displayText: 'Surge Diverter(s)',
    matchers: [
      { subcategory: 'Surge Protection Equipment' },
      { subcategory: 'Surge Diverter' },
      { name: 'Surge Diverter' },
      { name: 'SPD' }
    ]
  },
  {
    id: 'power-meters',
    displayText: 'Power Meter(s)',
    matchers: [
      { subcategory: 'Power Meters' },
      { name: 'Power Meter' }
    ]
  },
  {
    id: 'ats',
    displayText: 'Automatic Transfer Switch',
    matchers: [
      { subcategory: 'ATS' },
      { name: 'ATS' },
      { name: 'Automatic Transfer Switch' }
    ]
  },
  {
    id: 'mts',
    displayText: 'Manual Transfer Switch',
    matchers: [
      { subcategory: 'MTS' },
      { name: 'MTS' },
      { name: 'Manual Transfer Switch' }
    ]
  },
  {
    id: 'heater',
    displayText: 'Anti-condensation Heater(s)',
    matchers: [
      { name: 'Heater' },
      { subcategory: 'Heater' },
      { name: 'Anti-condensation Heater' },
      { subcategory: 'Anti-condensation Heater' },
      { subcategory: 'Temperature' }
    ]
  }
];

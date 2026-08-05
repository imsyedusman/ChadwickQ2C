export interface DynamicMiscSection {
    heading: string;
    type: 'dynamic';
    subcategories: string[];
    subSections?: {
        subheading: string;
        subcategory: string;
    }[];
}

export type StaticRow =
    | { type: 'single'; partNumber: string }
    | { type: 'sideBySide'; partNumberA: string; partNumberB: string }
    | { type: 'subheading'; label: string };

export interface StaticMiscSection {
    heading: string;
    type: 'static';
    rows: StaticRow[];
}

export type MiscSectionConfig = DynamicMiscSection | StaticMiscSection;

export const SG_MISC_LAYOUT: MiscSectionConfig[] = [
    {
        heading: 'Power Meters',
        type: 'static',
        rows: [
            { type: 'subheading', label: 'Schneider' },
            { type: 'single', partNumber: 'A9MEM3155' },
            { type: 'single', partNumber: 'A9MEM3355' },
            { type: 'single', partNumber: 'A9MEM3255' },
            { type: 'single', partNumber: 'METSEPM3250' },
            { type: 'single', partNumber: 'METSEPM5110' },
            { type: 'single', partNumber: 'METSEPM5350' },
            { type: 'single', partNumber: 'METSEPM5560' },
            { type: 'single', partNumber: 'METSEPM8240' },
            { type: 'single', partNumber: 'LV434000' },
            { type: 'single', partNumber: 'LV434001' },
            { type: 'single', partNumber: 'LV434002' },
            { type: 'single', partNumber: 'LV434205' },
            { type: 'single', partNumber: 'LV454444' },
            { type: 'single', partNumber: 'TRV00217' },
            { type: 'sideBySide', partNumberA: 'TRV00121', partNumberB: 'LV434201' },
            { type: 'sideBySide', partNumberA: 'LV434128', partNumberB: 'LV434201' },
            { type: 'single', partNumber: 'LV434201' },
            { type: 'subheading', label: 'MERCS' },
            { type: 'single', partNumber: 'INT-STRIDER-M72-MODBUS-96MM' },
            { type: 'single', partNumber: 'INT-STRIDER-M73-ETHERNET-96MM' },
            { type: 'subheading', label: 'NHP' },
            { type: 'single', partNumber: 'EM2172RVV53XOSX' },
            { type: 'single', partNumber: 'EM24DINAV93XISX' },
            { type: 'single', partNumber: 'EM24DINAV53DISX' },
            { type: 'single', partNumber: 'MF72421' },
            { type: 'single', partNumber: 'NEMO96HD1000' },
            { type: 'single', partNumber: 'NEMO96HD1300' },
            { type: 'sideBySide', partNumberA: 'EM27072DMV53X2SN', partNumberB: 'TCD3X630150CMX' },
            { type: 'subheading', label: 'IPD' },
            { type: 'single', partNumber: '48250402' },
            { type: 'sideBySide', partNumberA: '48250500', partNumberB: '48250082' },
            { type: 'sideBySide', partNumberA: '48250501', partNumberB: '48250082' },
            { type: 'single', partNumber: '48290105' },
            { type: 'single', partNumber: '48290106' },
            { type: 'single', partNumber: '48290102' },
            { type: 'single', partNumber: '48290110' },
            { type: 'single', partNumber: '48290111' },
            { type: 'single', partNumber: '48290128' },
            { type: 'single', partNumber: '48290130' },
            { type: 'single', partNumber: '48290112' },
            { type: 'single', partNumber: '48290101' },
            { type: 'single', partNumber: '48290200' },
            { type: 'single', partNumber: '48290204' },
            { type: 'single', partNumber: '48290500' },
            { type: 'single', partNumber: '48290501' },
            { type: 'single', partNumber: '48290502' },
            { type: 'single', partNumber: '48290503' },
            { type: 'single', partNumber: '48290504' },
            { type: 'single', partNumber: '48290505' },
            { type: 'single', partNumber: '48290506' }
        ]
    },
    {
        heading: 'Fuses',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Fuses']
    },
    {
        heading: 'Wiring',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Wiring']
    },
    {
        heading: 'Current Transformers',
        type: 'static',
        rows: [
            { type: 'single', partNumber: 'TAS127B40005A' },
            { type: 'single', partNumber: 'TAS127B30005A' },
            { type: 'single', partNumber: 'TAS102H25005A' },
            { type: 'single', partNumber: 'TAS102H20005A' },
            { type: 'single', partNumber: 'TAS6512005A' },
            { type: 'single', partNumber: 'TAS6510005A' },
            { type: 'single', partNumber: 'TAS656005A' },
            { type: 'single', partNumber: 'TAIBB405A' }
        ]
    },
    {
        heading: 'Surge Protection Equipment',
        type: 'dynamic',
        subcategories: [],
        subSections: [
            { subheading: 'Surge Diverter', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
            { subheading: 'Surge Filter', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' }
        ]
    },
    {
        heading: 'General Control',
        type: 'static',
        rows: [
            { type: 'single', partNumber: 'CHD-FUSE-20A-DIN' },
            { type: 'single', partNumber: 'PBELKIT4' },
            { type: 'single', partNumber: 'A9C20134' },
            { type: 'single', partNumber: 'A9C20134' },
            { type: 'single', partNumber: 'CCT15854' },
            { type: 'single', partNumber: 'CCT15443' },
            { type: 'single', partNumber: 'CCT15940' },
            { type: 'single', partNumber: 'CCT15369' },
            { type: 'single', partNumber: 'CCT15369' },
            { type: 'single', partNumber: 'XB4BD33' },
            { type: 'single', partNumber: 'CHD-GC-RELAY-4P' },
            { type: 'single', partNumber: 'RM17TG00' },
            { type: 'single', partNumber: 'XB5AVM4' },
            { type: 'single', partNumber: 'CHD-WIRING-CONTROL' }
        ]
    },
    {
        heading: 'Fault Current Limiters',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Fault Current Limiters']
    },
    {
        heading: 'Contactor 3P',
        type: 'static',
        rows: [
            { type: 'single', partNumber: 'LC1D25U7' },
            { type: 'single', partNumber: 'LC1D32U7' },
            { type: 'single', partNumber: 'LC1D40U7' },
            { type: 'single', partNumber: 'LC1D50U7' },
            { type: 'single', partNumber: 'LC1D65U7' },
            { type: 'single', partNumber: 'LC1D80U7' },
            { type: 'single', partNumber: 'LC1D95U7' },
            { type: 'single', partNumber: 'LC1D115U7' },
            { type: 'single', partNumber: 'LC1D150U7' },
            { type: 'single', partNumber: 'LC1F115U7' },
            { type: 'single', partNumber: 'LC1F150U7' },
            { type: 'single', partNumber: 'LC1F185U7' },
            { type: 'single', partNumber: 'LC1F225U7' }
        ]
    },
    {
        heading: 'Temperature Control',
        type: 'dynamic',
        subcategories: ['Miscellaneous > General Control > Temperature']
    }
];

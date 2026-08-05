export interface DynamicMiscSection {
    heading: string;
    type: 'dynamic';
    subcategories: string[];
    brandFilter?: boolean;
    subSections?: {
        subheading: string;
        subcategory: string;
    }[];
}

export interface StaticMiscSection {
    heading: string;
    type: 'static';
    partNumbers: string[];
}

export type MiscSectionConfig = DynamicMiscSection | StaticMiscSection;

export const SG_MISC_LAYOUT: MiscSectionConfig[] = [
    {
        heading: 'Power Meters',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Power Metering', 'Miscellaneous > Metering Accessories'],
        brandFilter: true
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
        type: 'dynamic',
        subcategories: ['Miscellaneous > Current Transformers', 'Circuit Breakers > MCCB Accessories > Add on CT Module']
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
        partNumbers: [
            'CHD-FUSE-20A-DIN',
            'PBELKIT4',
            'A9C20134',
            'A9C20134',
            'CCT15854',
            'CCT15443',
            'CCT15940',
            'CCT15369',
            'CCT15369',
            'XB4BD33',
            'CHD-GC-RELAY-4P',
            'RM17TG00',
            'XB5AVM4',
            'CHD-WIRING-CONTROL'
        ]
    },
    {
        heading: 'Fault Current Limiters',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Fault Current Limiters']
    },
    {
        heading: 'Contactor 3P',
        type: 'dynamic',
        subcategories: ['Miscellaneous > Contactor > 3P']
    },
    {
        heading: 'Temperature Control',
        type: 'dynamic',
        subcategories: ['Miscellaneous > General Control > Temperature']
    }
];

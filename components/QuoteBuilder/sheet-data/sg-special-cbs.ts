import { RowDef as BaseRowDef } from './sg-cbs';

export type SpecialRowDef = BaseRowDef | { type: 'spacer' };

export type SpecialSectionDef = {
    heading: string;
    rows: SpecialRowDef[];
};

export const SG_SPECIAL_CBS_LAYOUT: SpecialSectionDef[] = [
    {
        heading: "Circuit Breakers – 3P 50kA",
        rows: [
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33460' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33460' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33460' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33460' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33466' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33466' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33466' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33466' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33472' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33472' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33472' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33472' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33478' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33478' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33478' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33478' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33482' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33482' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33482' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33482' }
        ]
    },
    {
        heading: "Circuit Breakers – 3P 70kA",
        rows: [
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33461' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33461' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33461' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33461' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33467' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33467' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33467' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33467' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33473' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33473' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33473' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33473' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33479' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33479' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33479' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33479' },
            { type: 'spacer' },
            { type: 'paired', tripPartNumber: '47058', basePartNumber: '33483' },
            { type: 'paired', tripPartNumber: '47061', basePartNumber: '33483' },
            { type: 'paired', tripPartNumber: '47059', basePartNumber: '33483' },
            { type: 'paired', tripPartNumber: '47062', basePartNumber: '33483' }
        ]
    },
    {
        heading: "Circuit Breaker Accessories",
        rows: [
            { type: 'single', partNumber: 'LV429517' },
            { type: 'single', partNumber: 'LV432593' },
            { type: 'single', partNumber: '33628' },
            { type: 'single', partNumber: 'LV429338T' },
            { type: 'single', partNumber: 'LV432598T' },
            { type: 'single', partNumber: '33873' },
            { type: 'single', partNumber: 'NS1600MO' }
        ]
    }
];

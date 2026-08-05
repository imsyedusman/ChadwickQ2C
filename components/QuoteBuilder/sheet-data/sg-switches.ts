import { StaticRow } from './sg-misc';

export type SwitchesSectionConfig = {
  heading: string;
  rows: StaticRow[];
};

export const SG_SWITCHES_LAYOUT: SwitchesSectionConfig[] = [
  {
    heading: 'Isolators – 3P',
    rows: [
      { type: 'single', partNumber: 'SLB1253P' },
      { type: 'single', partNumber: 'SLB1603P' },
      { type: 'single', partNumber: 'SLB2003P' },
      { type: 'single', partNumber: 'SLB2503P' },
      { type: 'single', partNumber: 'SLB4003P' },
      { type: 'single', partNumber: 'SLB6303P' },
      { type: 'single', partNumber: 'SLB8003P' },
      { type: 'single', partNumber: 'SLB10003P' },
      { type: 'single', partNumber: 'SLB12503P' },
      { type: 'single', partNumber: 'SLB16003P' },
      { type: 'single', partNumber: 'SLB20003P' },
      { type: 'single', partNumber: 'SLB25003P' },
      { type: 'single', partNumber: 'SLB32003P' },
      { type: 'single', partNumber: 'SLB40003P' },
    ],
  },
  {
    heading: 'Isolators – 4P',
    rows: [
      { type: 'single', partNumber: 'SLB1254P' },
      { type: 'single', partNumber: 'SLB1604P' },
      { type: 'single', partNumber: 'SLB2004P' },
      { type: 'single', partNumber: 'SLB2504P' },
      { type: 'single', partNumber: 'SLB4004P' },
      { type: 'single', partNumber: 'SLB6304P' },
      { type: 'single', partNumber: 'SLB8004P' },
      { type: 'single', partNumber: 'SLB10004P' },
      { type: 'single', partNumber: 'SLB12504P' },
      { type: 'single', partNumber: 'SLB16004P' },
      { type: 'single', partNumber: 'SLB20004P' },
      { type: 'single', partNumber: 'SLB25004P' },
      { type: 'single', partNumber: 'SLB32004P' },
      { type: 'single', partNumber: 'SLB40004P' },
      { type: 'single', partNumber: 'CHD-KEYBOX-3-1' },
      { type: 'single', partNumber: 'CHD-KEYBOX-2-1' },
      { type: 'single', partNumber: 'CHD-CASTELL-IL' },
      { type: 'single', partNumber: 'CHD-CASTELL-KEY' },
    ],
  },
  {
    heading: 'Changeover Switches – 4P/4P MTS',
    rows: [
      { type: 'single', partNumber: 'SCO1254PSTD' },
      { type: 'single', partNumber: 'SCO1604PSTD' },
      { type: 'single', partNumber: 'SCO2004PSTD' },
      { type: 'single', partNumber: 'SCO2504PSTD' },
      { type: 'single', partNumber: 'SCO4004PSTD' },
      { type: 'single', partNumber: 'SCO6304PSTD' },
      { type: 'single', partNumber: 'SCO8004PSTD' },
      { type: 'single', partNumber: 'SCO12504PSTD' },
      { type: 'single', partNumber: 'SCO16004PSTD' },
      { type: 'single', partNumber: 'SCO20004PSTD' },
      { type: 'single', partNumber: 'SCO25004PSTD' },
      { type: 'single', partNumber: 'SCO32004PSTD' },
    ],
  },
  {
    heading: 'Changeover Switches – 4P/4P ATS + Logic + Remote Display',
    rows: [
      { type: 'single', partNumber: '95734012' },
      { type: 'single', partNumber: '95734016' },
      { type: 'single', partNumber: '95734020' },
      { type: 'single', partNumber: '95734025' },
      { type: 'single', partNumber: '95734031' },
      { type: 'single', partNumber: '95734040' },
      { type: 'single', partNumber: '95734050' },
      { type: 'single', partNumber: '95734063' },
      { type: 'single', partNumber: '95734080' },
      { type: 'single', partNumber: '95734100' },
      { type: 'single', partNumber: '95734120' },
      { type: 'single', partNumber: '95734160' },
      { type: 'single', partNumber: '95734200' },
      { type: 'single', partNumber: '95734250' },
      { type: 'single', partNumber: '95734320' },
    ],
  },
];

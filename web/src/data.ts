import { FilterSection } from "./types";

export const COLORS: string[] = [
  'rgb(0, 128, 215)',
  'rgb(76, 172, 225)',
  'rgb(159, 174, 56)',
  'rgb(201, 199, 42)',
  'rgb(255, 209, 48)',
  'rgb(247, 170, 53)',
  'rgb(246, 131, 30)',
  'rgb(241, 95, 34)',
  'rgb(239, 28, 32)',
  'rgb(189, 24, 30)',
];

export const FILTERS: FilterSection[] = [
  {
    title: 'Project',
    options: [
      {
        value: 'cncf',
        name: 'CNCF Projects',
        suboptions: [
          {
            value: 'graduated',
            name: 'Graduated'
          },
          {
            value: 'incubating',
            name: 'Incubating'
          },
          {
            value: 'sandbox',
            name: 'Sandbox'
          },
          {
            value: 'archived',
            name: 'Arichived'
          }
        ]
      },
      {
        value: 'non-cncf',
        name: 'Non CNCF Projects'
      }
    ]
  }
];

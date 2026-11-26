import { css } from 'solid-styled-components';

/** Layout variant of the item modal sections. */
export type SectionVariant = 'desktop' | 'mobile';

/** Outlined dark badge (categories, TAGs, organization kind). */
export const BadgeOutlineDark = css`
  border: 1px solid var(--bs-gray-700);
  color: var(--bs-gray-700) !important;
`;

/** Bordered desktop section; consecutive sections get extra spacing. */
export const Fieldset = css`
  padding: 1.5rem 1.75rem;
  margin-top: 2rem;

  & + & {
    margin-top: 3rem;
  }
`;

/** Title floating over the border of a desktop section. */
export const FieldsetTitle = css`
  font-size: 0.8rem;
  line-height: 0.8rem;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
`;

/** Small badge text. */
export const MiniBadge = css`
  font-size: 0.65rem !important;
`;

/** Heading of a mobile section. */
export const SectionTitle = css`
  font-size: 1rem;
  color: var(--color4);
  margin-bottom: 1rem;

  & + & {
    margin-bottom: 3rem;
  }
`;

/** Spacing between the summary blocks. */
export const Summary = css`
  .summaryBlock + .summaryBlock {
    margin-top: 1.15rem;
  }
`;

/** Badge of the summary personas and tags. */
export const SummaryBadge = css`
  background-color: var(--color-stats-1);
`;

/** Summary block text, per variant. */
export const SummaryContent: Record<SectionVariant, string> = {
  desktop: css`
    font-size: 0.8rem !important;
  `,
  mobile: css`
    font-size: 0.9rem !important;
  `,
};

/** Table body cells, per variant. */
export const TableContent: Record<SectionVariant, string> = {
  desktop: css`
    td {
      font-size: 0.8rem !important;
      line-height: 2;
    }
  `,
  mobile: css`
    td {
      font-size: 0.7rem !important;
      line-height: 2;
    }
  `,
};

/** Fixed table layout, so long values truncate instead of widening the table. */
export const TableLayout = css`
  table-layout: fixed;
`;

/** Table header. */
export const Thead = css`
  font-size: 0.8rem !important;

  th {
    color: var(--bs-gray-600);
  }
`;

/** Subtitle inside a section (e.g. "Funding rounds"), per variant. */
export const TitleInSection: Record<SectionVariant, string> = {
  desktop: css`
    font-size: 0.8rem;
    opacity: 0.5;
  `,
  mobile: css`
    font-size: 0.9rem;
    opacity: 0.5;
  `,
};

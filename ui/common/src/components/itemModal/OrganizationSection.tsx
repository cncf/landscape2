import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { REGEX_UNDERSCORE } from '../../data/data';
import type { Item } from '../../types/datasets';
import type { Acquisition, FundingRound } from '../../types/generated';
import { cx } from '../../utils/cx';
import { formatProfitLabel } from '../../utils/formatProfitLabel';
import { prettifyNumber } from '../../utils/prettifyNumber';
import { Box } from '../Box';
import { ExternalLink } from '../ExternalLink';
import { CrunchbaseTable, type CrunchbaseTableColumn } from './CrunchbaseTable';
import { formatEmployeesRange, formatLocation } from './helpers';
import { Section } from './Section';
import { BadgeOutlineDark, MiniBadge, type SectionVariant, TitleInSection } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

const MinCol = css`
  width: 200px;

  @media only screen and (max-width: 991.98px) {
    width: 150px;
  }

  @media only screen and (max-width: 767.98px) {
    width: 90px;
  }
`;

const Location: Record<SectionVariant, string> = {
  desktop: css`
    font-size: 0.8rem;
  `,
  mobile: css`
    font-size: 0.9rem;
  `,
};

const Text = css`
  font-size: 0.9rem !important;
`;

/**
 * Renders the header of the announcement date columns; "on" is dropped on small screens. It is defined
 * before the column sets, which reference it at module evaluation.
 */
const announcedOnHeader = () => (
  <>
    Announced <span class="d-none d-md-inline-block">on</span>
  </>
);

/** Columns of the acquisitions table. */
export const ACQUISITION_COLUMNS: CrunchbaseTableColumn<Acquisition>[] = [
  { header: () => 'Name', class: 'text-truncate text-muted', cell: (row) => row.acquiree_name },
  {
    header: () => 'Price (USD)',
    headerClass: MinCol,
    class: `text-center text-nowrap ${MinCol}`,
    cell: (row) => formatPrice(row.price),
  },
  {
    header: announcedOnHeader,
    headerClass: `text-nowrap ${MinCol}`,
    class: `text-center text-nowrap text-muted ${MinCol}`,
    cell: (row) => row.announced_on,
  },
];

/** Columns of the funding rounds table. */
export const FUNDING_ROUND_COLUMNS: CrunchbaseTableColumn<FundingRound>[] = [
  {
    header: () => 'Investment type',
    class: 'text-truncate text-muted text-capitalize',
    cell: (row) => row.kind?.replace(REGEX_UNDERSCORE, ' ') ?? '-',
  },
  {
    header: () => 'Price (USD)',
    headerClass: MinCol,
    class: `text-center text-nowrap ${MinCol}`,
    cell: (row) => formatPrice(row.amount),
  },
  {
    header: announcedOnHeader,
    headerClass: `text-nowrap ${MinCol}`,
    class: `text-center text-nowrap text-muted ${MinCol}`,
    cell: (row) => row.announced_on,
  },
];

/**
 * Organization the item belongs to, from its Crunchbase data: kind, location, funding, employees, stock
 * information, funding rounds (or the `funding_url` that replaces them) and acquisitions.
 */
export const OrganizationSection = (props: Props) => {
  const isMobile = () => props.variant === 'mobile';

  return (
    <Show when={props.item.crunchbase_data}>
      {(organization) => {
        const location = () => formatLocation(organization());
        const boxClass = () => (isMobile() ? 'col-6' : undefined);
        const badgeClass = () =>
          `badge rounded-0 text-dark text-uppercase ${isMobile() ? 'me-2' : 'ms-3'} ${BadgeOutlineDark} ${MiniBadge}`;
        const badges = () => (
          <>
            <Show when={organization().kind}>{(kind) => <div class={badgeClass()}>{kind()}</div>}</Show>
            <Show when={organization().company_type}>
              {(companyType) => <div class={badgeClass()}>{formatProfitLabel(companyType())}</div>}
            </Show>
          </>
        );

        return (
          <Section title="Organization" variant={props.variant}>
            <Show
              when={isMobile()}
              fallback={
                <div class="d-flex flex-row align-items-center">
                  <div class="fw-semibold text-truncate fs-6">{organization().name}</div>
                  {badges()}
                </div>
              }
            >
              <div class={`fw-semibold text-truncate my-2 ${Text}`}>{organization().name}</div>
              <div class="d-flex flex-row align-items-center">{badges()}</div>
            </Show>
            <Show when={location()}>
              <div class={`text-muted ${isMobile() ? 'py-2' : 'pt-1'} ${Location[props.variant]}`}>{location()}</div>
            </Show>
            <div class="mt-3">
              <small class="text-muted">{organization().description}</small>
            </div>
            <div class={cx('row g-4 my-0 mb-2', isMobile() && 'mx-1 justify-content-center')}>
              <Box
                class={boxClass()}
                value={organization().funding !== undefined ? prettifyNumber(organization().funding!) : '-'}
                legend="Funding"
                description="Funding"
              />
              <Box
                class={boxClass()}
                value={formatEmployeesRange(organization().num_employees_min, organization().num_employees_max)}
                legend="Employees"
                description="Employees number"
              />
              <Box
                class={boxClass()}
                value={organization().stock_exchange || '-'}
                legend="Stock exchange"
                description="Stock exchange"
              />
              <Box class={boxClass()} value={organization().ticker || '-'} legend="Ticker" description="Ticker" />
            </div>

            <Show
              when={props.item.funding_url}
              fallback={
                <CrunchbaseTable
                  title="Funding rounds"
                  rows={organization().funding_rounds ?? []}
                  columns={FUNDING_ROUND_COLUMNS}
                  titleClass={TitleInSection[props.variant]}
                />
              }
            >
              {(fundingUrl) => (
                <>
                  <div class={`fw-bold text-uppercase mt-3 mt-lg-4 mb-2 mb-lg-3 ${TitleInSection[props.variant]}`}>
                    Funding rounds
                  </div>
                  <Show
                    when={isMobile()}
                    fallback={
                      <div class="d-flex align-items-baseline w-100 my-3">
                        <small class="text-muted lh-1 me-2">For more financial details, see:</small>
                        <ExternalLink
                          class="text-muted d-inline-block text-truncate mw-100 lh-1 small"
                          href={fundingUrl()}
                        >
                          {fundingUrl()}
                        </ExternalLink>
                      </div>
                    }
                  >
                    <div class="w-100 my-1">
                      <small class="text-muted lh-1">For more financial details, see:</small>
                      <div class="mt-1 lh-1">
                        <ExternalLink
                          class="text-muted d-inline-block text-truncate text-decoration-underline mw-100 lh-1"
                          href={fundingUrl()}
                        >
                          {fundingUrl()}
                        </ExternalLink>
                      </div>
                    </div>
                  </Show>
                </>
              )}
            </Show>

            <CrunchbaseTable
              title="Acquisitions"
              rows={organization().acquisitions ?? []}
              columns={ACQUISITION_COLUMNS}
              titleClass={TitleInSection[props.variant]}
            />
          </Section>
        );
      }}
    </Show>
  );
};

/** Formats a price in USD, or `-` when it is unknown. */
const formatPrice = (price?: number): string => (price !== undefined ? `$${prettifyNumber(price)}` : '-');

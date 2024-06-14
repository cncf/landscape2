import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import { css } from 'solid-styled-components';

import { AdditionalCategory, Item, SecurityAudit, SVGIconKind } from '../types/types';
import { cutString, getItemDescription } from '../utils';
import { formatProfitLabel } from '../utils/formatProfitLabel';
import { prettifyNumber } from '../utils/prettifyNumber';
import { AcquisitionsTable } from './AcquisitionsTable';
import { Badge } from './Badge';
import { Box } from './Box';
import { ExternalLink } from './ExternalLink';
import { FoundationBadge } from './FoundationBadge';
import { FundingRoundsTable } from './FundingRoundsTable';
import { Image } from './Image';
import { MaturityBadge } from './MaturityBadge';
import { MobileMaturitySection } from './MobileMaturitySection';
import { ParentProject } from './ParentProject';
import { RepositoriesSection } from './RepositoriesSection';
import { SVGIcon } from './SVGIcon';

interface Props {
  item?: Item | null;
  parentInfo?: Item | null;
  foundation: string;
  onClose?: () => void;
}

const LogoWrapper = css`
  height: 55px;
  width: 55px;
  min-width: 55px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const Title = css`
  font-size: 1.05rem;
  line-height: 1.5;
  /* Close button - modal */
  padding-right: 1.75rem;
`;

const Badges = css`
  font-size: 85% !important;
  height: 22px;

  .badge:not(.badgeOutlineDark) {
    height: 18px;
    line-height: 19px;
    font-size: 10.25px !important;
    padding: 0 0.65rem;
  }
`;

const Link = css`
  position: relative;
  color: inherit;
  height: 24px;
  line-height: 22px;
  width: auto;

  &:hover {
    color: var(--color1);
  }

  svg {
    position: relative;
    height: 18px;
    width: auto;
    margin-top: -1px;
  }
`;

const ItemInfo = css`
  background-color: #f8f9fa;
  width: calc(100% - 45px - 1rem);
  height: 85px;
`;

const TitleInSection = css`
  font-size: 0.9rem;
  opacity: 0.5;
`;

const Description = css`
  font-size: 0.9rem;
`;

const OtherLink = css`
  max-width: calc(100% - 2rem - 15px);
  font-size: 0.65rem !important;
  color: var(--color4);
  line-height: 16px;
`;

const Dot = css`
  line-height: 1;
`;

const Section = css`
  font-size: 0.8rem !important;

  small {
    font-size: 80%;
    opacity: 0.5;
  }
`;

const BadgeOutlineDark = css`
  border: 1px solid var(--bs-gray-700);
  color: var(--bs-gray-700) !important;
`;

const MiniBadge = css`
  font-size: 0.65rem !important;
`;

const Location = css`
  font-size: 0.9rem;
`;

const SectionTitle = css`
  font-size: 1rem;
  color: var(--color4);
  margin-bottom: 1rem;

  & + & {
    margin-bottom: 3rem;
  }
`;

const TableLayout = css`
  table-layout: fixed;
`;

const Thead = css`
  font-size: 0.8rem !important;

  th {
    color: var(--bs-gray-600);
  }
`;

const TableContent = css`
  td {
    font-size: 0.7rem !important;
    line-height: 2;
  }
`;

const Summary = css`
  .summaryBlock + .summaryBlock {
    margin-top: 1.15rem;
  }
`;

const SummaryBadge = css`
  background-color: var(--color-stats-1);
`;

const SummaryContent = css`
  font-size: 0.9rem !important;
`;

const Text = css`
  font-size: 0.9rem !important;
`;

const ClomonitorReport = css`
  max-width: 100%;
`;

export const ItemModalMobileContent = (props: Props) => {
  const itemInfo = () => props.item;
  const [description, setDescription] = createSignal<string>();

  createEffect(
    on(itemInfo, () => {
      if (!isUndefined(itemInfo()) && !isNull(itemInfo())) {
        setDescription(getItemDescription(itemInfo()!));
      } else {
        setDescription(undefined);
        if (props.onClose) props.onClose();
      }
    })
  );

  return (
    <Show when={!isNull(itemInfo()) && !isUndefined(itemInfo())}>
      <div class="d-flex flex-column mw-100">
        <div class="d-flex flex-column">
          <div class="d-flex flex-row align-items-center justify-content-between">
            <div class={`d-flex align-items-center justify-content-center ${LogoWrapper}`}>
              <Image name={itemInfo()!.name} class={`m-auto ${Logo}`} logo={itemInfo()!.logo} enableLazyLoad />
            </div>

            <div class={`p-3 ${ItemInfo}`}>
              <div class={`fw-semibold text-truncate mb-1 ${Title}`}>{itemInfo()!.name}</div>

              <div class={`d-flex flex-row flex-wrap overflow-hidden align-items-center ${Badges}`}>
                <Show
                  when={!isUndefined(itemInfo()!.maturity)}
                  fallback={
                    <Show when={!isUndefined(itemInfo()!.member_subcategory)}>
                      <div
                        title={`${itemInfo()!.member_subcategory} member`}
                        class={`badge rounded-0 text-uppercase me-2 ${BadgeOutlineDark} badgeOutlineDark`}
                      >
                        {itemInfo()!.member_subcategory} member
                      </div>
                    </Show>
                  }
                >
                  <FoundationBadge class="me-2" foundation={props.foundation} />
                  <MaturityBadge level={cutString(itemInfo()!.maturity!, 16)} class="me-2" />
                </Show>

                <Show when={!isUndefined(itemInfo()!.website)}>
                  <ExternalLink title="Website" class={`me-2 ${Link}`} href={itemInfo()!.website!}>
                    <SVGIcon kind={SVGIconKind.World} />
                  </ExternalLink>
                </Show>

                <Show when={!isUndefined(itemInfo()!.twitter_url)}>
                  <ExternalLink title="X (Twitter)" class={`me-2 ${Link}`} href={itemInfo()!.twitter_url!}>
                    <SVGIcon kind={SVGIconKind.Twitter} />
                  </ExternalLink>
                </Show>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div class={`mt-4 mb-3 text-muted ${Description}`}>{description()}</div>
        <div class={`mb-2 ${Section}`}>
          <div class="text-truncate">
            <small class="text-uppercase fw-semibold pe-1">Category:</small>
            {itemInfo()!.category}
          </div>
          <div class="text-truncate">
            <small class="text-uppercase fw-semibold pe-1">Subcategory:</small>
            {itemInfo()!.subcategory}
          </div>
        </div>

        {/* Other links */}
        <Show when={!isUndefined(itemInfo()!.other_links)}>
          <div class="d-flex flex-row flex-wrap align-items-center mb-3 mt-1">
            <For each={itemInfo()!.other_links}>
              {(link, index) => {
                return (
                  <>
                    <ExternalLink
                      href={link.url}
                      class={`fw-semibold text-nowrap d-inline-block text-truncate text-uppercase me-2 mt-2 ${OtherLink}`}
                    >
                      {cutString(link.name, 30)}
                    </ExternalLink>
                    <Show when={index() !== itemInfo()!.other_links!.length - 1}>
                      <div class={`me-2 mt-2 ${Dot}`}>·</div>
                    </Show>
                  </>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Additional categories */}
        <Show when={!isUndefined(itemInfo()!.additional_categories) && !isEmpty(itemInfo()!.additional_categories)}>
          <div class={`fw-bold text-uppercase my-3 ${TitleInSection}`}>Additional categories</div>
          <div class="d-flex flex-column flex-sm-row align-items-start mb-1">
            <For each={itemInfo()!.additional_categories}>
              {(additional: AdditionalCategory) => {
                return (
                  <div
                    class={`badge rounded-0 text-truncate mb-2 me-2 me-sm-2 mw-100 ${BadgeOutlineDark} badgeOutlineDark`}
                  >
                    {additional.category} / {additional.subcategory}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        <Show when={!isNull(props.parentInfo)}>
          {/* Parent project */}
          <ParentProject
            parentInfo={props.parentInfo!}
            projectName={itemInfo()!.name}
            class={SectionTitle}
            foundation={props.foundation}
            mobileVersion
          />
        </Show>

        {/* Maturity */}
        <MobileMaturitySection item={itemInfo()!} titleClass={SectionTitle} />

        {/* Repositories */}
        <RepositoriesSection
          repositories={itemInfo()!.repositories}
          titleClass={`text-uppercase mt-3 mb-4 fw-semibold border-bottom ${SectionTitle}`}
          boxClass="col-6"
        />

        {/* Security audits */}
        <Show when={!isUndefined(itemInfo()!.audits) && !isEmpty(itemInfo()!.audits)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${SectionTitle}`}>Security audits</div>
          <div class="w-100">
            <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
              <thead class={`text-uppercase text-muted ${Thead}`}>
                <tr>
                  <th class="text-center" scope="col">
                    Date
                  </th>

                  <th class="text-center" scope="col">
                    Vendor
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={sortBy(itemInfo()!.audits, 'date').reverse()}>
                  {(audit: SecurityAudit) => {
                    return (
                      <tr class={TableContent}>
                        <td class="px-3 text-center text-nowrap">
                          <ExternalLink class="text-muted d-block text-decoration-underline" href={audit.url}>
                            {audit.date}
                          </ExternalLink>
                        </td>
                        <td class="px-3 text-center text-nowrap">
                          <div class="w-100 text-truncate">{audit.vendor}</div>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* Organization */}
        <Show when={!isUndefined(itemInfo()!.crunchbase_data)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${SectionTitle}`}>Organization</div>
          <div class={`fw-semibold text-truncate my-2 ${Text}`}>{itemInfo()!.crunchbase_data!.name}</div>
          <div class="d-flex flex-row align-items-center">
            <Show when={!isUndefined(itemInfo()!.crunchbase_data!.kind)}>
              <div
                class={`me-2 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} badgeOutlineDark ${MiniBadge}`}
              >
                {itemInfo()!.crunchbase_data!.kind}
              </div>
            </Show>
            <Show when={!isUndefined(itemInfo()!.crunchbase_data!.company_type)}>
              <div
                class={`me-2 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} badgeOutlineDark ${MiniBadge}`}
              >
                {formatProfitLabel(itemInfo()!.crunchbase_data!.company_type!)}
              </div>
            </Show>
          </div>
          <Show
            when={!isUndefined(itemInfo()!.crunchbase_data!.city) || !isUndefined(itemInfo()!.crunchbase_data!.country)}
          >
            <div class={`text-muted py-2 ${Location}`}>
              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.city)}>{itemInfo()!.crunchbase_data!.city}</Show>
              <Show
                when={
                  !isUndefined(itemInfo()!.crunchbase_data!.city) && !isUndefined(itemInfo()!.crunchbase_data!.country)
                }
              >
                <>, </>
              </Show>

              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.country)}>
                {itemInfo()!.crunchbase_data!.country}
              </Show>
            </div>
          </Show>
          <div class="mt-3">
            <small class="text-muted">{itemInfo()!.crunchbase_data!.description}</small>
          </div>
          <div class="row g-4 my-0 mx-1 mb-2 justify-content-center">
            <Box
              class="col-6"
              value={
                !isUndefined(itemInfo()!.crunchbase_data!.funding)
                  ? prettifyNumber(itemInfo()!.crunchbase_data!.funding!)
                  : '-'
              }
              legend="Funding"
            />

            <Box
              class="col-6"
              value={
                <Switch>
                  <Match
                    when={
                      isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                      isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                    }
                  >
                    -
                  </Match>
                  <Match
                    when={
                      !isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                      !isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                    }
                  >
                    {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_min!)} -{' '}
                    {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_max!)}
                  </Match>
                  <Match
                    when={
                      !isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                      isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                    }
                  >
                    {'> '}
                    {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_min!)}
                  </Match>
                  <Match
                    when={
                      isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                      !isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                    }
                  >
                    {'< '}
                    {prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_max!)}
                  </Match>
                </Switch>
              }
              legend="Employees"
            />

            <Box class="col-6" value={itemInfo()!.crunchbase_data!.stock_exchange! || '-'} legend="Stock exchange" />

            <Box class="col-6" value={itemInfo()!.crunchbase_data!.ticker || '-'} legend="Ticker" />
          </div>

          {/* Funding rounds */}
          <Show
            when={
              !isUndefined(itemInfo()!.crunchbase_data!.funding_rounds) &&
              !isEmpty(itemInfo()!.crunchbase_data!.funding_rounds!)
            }
          >
            <FundingRoundsTable rounds={itemInfo()!.crunchbase_data!.funding_rounds!} titleClassName={TitleInSection} />
          </Show>

          {/* Acquisitions */}
          <Show
            when={
              !isUndefined(itemInfo()!.crunchbase_data!.acquisitions) &&
              !isEmpty(itemInfo()!.crunchbase_data!.acquisitions!)
            }
          >
            <AcquisitionsTable
              acquisitions={itemInfo()!.crunchbase_data!.acquisitions!}
              titleClassName={TitleInSection}
            />
          </Show>
        </Show>

        {/* Summary */}
        <Show when={!isUndefined(itemInfo()!.summary)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${SectionTitle}`}>Summary</div>
          <div class={`my-2 ${Summary}`}>
            <Show when={!isUndefined(itemInfo()!.summary!.intro_url) && !isEmpty(itemInfo()!.summary!.intro_url)}>
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Introduction</div>
                <div class={`mt-2 text-truncate ${SummaryContent}`}>{itemInfo()!.summary!.intro_url!}</div>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.use_case) && !isEmpty(itemInfo()!.summary!.use_case)}>
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Use case</div>
                <div class={`mt-2 ${SummaryContent}`}>{itemInfo()!.summary!.use_case!}</div>
              </div>
            </Show>

            <Show
              when={
                !isUndefined(itemInfo()!.summary!.business_use_case) && !isEmpty(itemInfo()!.summary!.business_use_case)
              }
            >
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Business use case</div>
                <div class={`mt-2 ${SummaryContent}`}>{itemInfo()!.summary!.business_use_case!}</div>
              </div>
            </Show>

            <Show
              when={
                (!isUndefined(itemInfo()!.summary!.integrations) || !isUndefined(itemInfo()!.summary!.integration)) &&
                !isEmpty(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)
              }
            >
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Integrations</div>
                <div class={`mt-2 ${SummaryContent}`}>
                  {(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)!}
                </div>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.release_rate) && !isEmpty(itemInfo()!.summary!.release_rate)}>
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Release rate</div>
                <div class={`mt-2 ${SummaryContent}`}>{itemInfo()!.summary!.release_rate!}</div>
              </div>
            </Show>

            <Show
              when={!isUndefined(itemInfo()!.summary!.personas) && !isEmpty(compact(itemInfo()!.summary!.personas!))}
            >
              {' '}
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Personas</div>
                <For each={compact(itemInfo()!.summary!.personas!)}>
                  {(persona) => {
                    return <Badge text={persona} class={`me-2 mt-2 ${SummaryBadge}`} />;
                  }}
                </For>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.tags) && !isEmpty(compact(itemInfo()!.summary!.tags!))}>
              <div class="summaryBlock">
                <div class={`fw-bold text-uppercase ${TitleInSection}`}>Tags</div>
                <For each={compact(itemInfo()!.summary!.tags!)}>
                  {(tag) => {
                    return <Badge text={tag} class={`me-2 mt-2 ${SummaryBadge}`} />;
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* CLOMonitor */}
        <Show when={!isUndefined(itemInfo()!.clomonitor_name)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${SectionTitle}`}>CLOMonitor report summary</div>

          <div class="my-2 d-flex justify-content-center w-100 align-items-center">
            <ExternalLink
              href={`https://clomonitor.io/projects/${props.foundation.toLowerCase()}/${itemInfo()!.clomonitor_name!}`}
            >
              <Image
                name={`CLOMonitor report summary for ${itemInfo()!.name}`}
                logo={itemInfo()!.clomonitor_report_summary!}
                class={ClomonitorReport}
              />
            </ExternalLink>
          </div>
        </Show>
      </div>
    </Show>
  );
};

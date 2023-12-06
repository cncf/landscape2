import { isNull } from 'lodash';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import moment from 'moment';
import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import { AdditionalCategory, Item, Repository, SecurityAudit, SVGIconKind } from '../../../types';
import cutString from '../../../utils/cutString';
import formatProfitLabel from '../../../utils/formatLabelProfit';
import getItemDescription from '../../../utils/getItemDescription';
import prettifyNumber from '../../../utils/prettifyNumber';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Badge from '../Badge';
import ExternalLink from '../ExternalLink';
import FoundationBadge from '../FoundationBadge';
import Image from '../Image';
import MaturityBadge from '../MaturityBadge';
import SVGIcon from '../SVGIcon';
import AcquisitionsTable from './AcquisitionsTable';
import Box from './Box';
import FundingRoundsTable from './FundingRoundsTable';
import LanguagesStats from './LanguagesStats';
import styles from './MobileContent.module.css';
import MobileMaturitySection from './MobileMaturitySection';
import ParticipationStats from './ParticipationStats';

interface Props {
  item?: Item | null;
}

const MobileContent = (props: Props) => {
  const itemInfo = () => props.item;
  const updateActiveItemId = useUpdateActiveItemId();
  const [description, setDescription] = createSignal<string>();
  const [mainRepo, setMainRepo] = createSignal<Repository>();
  const [websiteUrl, setWebsiteUrl] = createSignal<string>();
  const [mainRepoUrl, setMainRepoUrl] = createSignal<string>();

  const formatDate = (date: string): string => {
    return moment(date).format("MMM 'YY");
  };

  createEffect(
    on(itemInfo, () => {
      if (!isUndefined(itemInfo()) && !isNull(itemInfo())) {
        let mainRepoTmp: Repository | undefined;
        const websiteUrlTmp = itemInfo()!.homepage_url;
        setWebsiteUrl(itemInfo()!.homepage_url);
        setDescription(getItemDescription(itemInfo()!));
        if (!isUndefined(itemInfo()!.repositories)) {
          itemInfo()!.repositories!.forEach((repo: Repository) => {
            if (repo.primary) {
              mainRepoTmp = repo;
            }
          });

          if (mainRepoTmp) {
            setMainRepo(mainRepoTmp);
            setMainRepoUrl(new URL(mainRepoTmp.url).pathname);
          }
        }

        // If homepage_url is undefined or is equal to main repository url
        // and maturity field is undefined,
        // we use the homepage_url fron crunchbase
        if (isUndefined(websiteUrlTmp) || (mainRepoTmp && websiteUrlTmp === mainRepoTmp.url)) {
          if (itemInfo()!.crunchbase_data && itemInfo()!.crunchbase_data!.homepage_url) {
            setWebsiteUrl(itemInfo()!.crunchbase_data!.homepage_url);
          }
        }
      } else {
        setMainRepo(undefined);
        setDescription(undefined);
        setWebsiteUrl(undefined);
        updateActiveItemId(); // Close modal
      }
    })
  );

  return (
    <Show when={!isNull(itemInfo()) && !isUndefined(itemInfo())}>
      <div class="d-flex flex-column mw-100">
        <div class="d-flex flex-column">
          <div class="d-flex flex-row align-items-center justify-content-between">
            <div class={`d-flex align-items-center justify-content-center ${styles.logoWrapper}`}>
              <Image name={itemInfo()!.name} class={`m-auto ${styles.logo}`} logo={itemInfo()!.logo} enableLazyLoad />
            </div>

            <div class={`p-3 ${styles.itemInfo}`}>
              <div class={`fw-semibold text-truncate mb-1 ${styles.title}`}>{itemInfo()!.name}</div>

              <div class={`d-flex flex-row flex-wrap overflow-hidden align-items-center ${styles.badges}`}>
                <Show
                  when={!isUndefined(itemInfo()!.maturity)}
                  fallback={
                    <Show when={!isUndefined(itemInfo()!.member_subcategory)}>
                      <div
                        title={`${itemInfo()!.member_subcategory} member`}
                        class={`badge rounded-0 text-uppercase border me-2 ${styles.badgeOutlineDark}`}
                      >
                        {itemInfo()!.member_subcategory} member
                      </div>
                    </Show>
                  }
                >
                  <FoundationBadge class="me-2" />
                  <MaturityBadge level={cutString(itemInfo()!.maturity!, 16)} class="me-2" />
                </Show>

                <Show when={!isUndefined(websiteUrl())}>
                  <ExternalLink title="Website" class={`me-2 ${styles.link}`} href={websiteUrl()!}>
                    <SVGIcon kind={SVGIconKind.World} />
                  </ExternalLink>
                </Show>

                <Show when={!isUndefined(itemInfo()!.twitter_url)}>
                  <ExternalLink title="Twitter" class={`me-2 ${styles.link}`} href={itemInfo()!.twitter_url!}>
                    <SVGIcon kind={SVGIconKind.Twitter} />
                  </ExternalLink>
                </Show>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div class={`mt-4 mb-3 text-muted ${styles.description}`}>{description()}</div>
        <div class={`mb-2 ${styles.section}`}>
          <div class="text-truncate">
            <small class="text-uppercase fw-semibold pe-1">Category:</small>
            {itemInfo()!.category}
          </div>
          <div class="text-truncate">
            <small class="text-uppercase fw-semibold pe-1">Subcategory:</small>
            {itemInfo()!.subcategory}
          </div>
        </div>

        {/* Additional categories */}
        <Show when={!isUndefined(itemInfo()!.additional_categories) && !isEmpty(itemInfo()!.additional_categories)}>
          <div class={`fw-bold text-uppercase my-3 ${styles.titleInSection}`}>Additional categories</div>
          <div class="d-flex flex-column align-items-start mb-1">
            <For each={itemInfo()!.additional_categories}>
              {(additional: AdditionalCategory) => {
                return (
                  <div class={`badge border rounded-0 text-truncate mb-2 mw-100 ${styles.badgeOutlineDark}`}>
                    {additional.category} / {additional.subcategory}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Maturity */}
        <MobileMaturitySection item={itemInfo()!} titleClass={styles.sectionTitle} />

        {/* Repositories */}
        <Show when={!isUndefined(itemInfo()!.repositories)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${styles.sectionTitle}`}>Repositories</div>
          <Show when={!isUndefined(mainRepo())}>
            <div class={`fw-bold text-uppercase my-2 ${styles.titleInSection}`}>Primary repository</div>

            <ExternalLink
              class={`p-0 align-baseline fw-semibold text-truncate my-2 ${styles.text}`}
              href={mainRepo()!.url}
            >
              <div class="d-flex flex-row align-items-center">
                <SVGIcon kind={SVGIconKind.GitHub} class="me-1" />
                <div class="text-truncate">{mainRepoUrl()!.slice(1)}</div>
              </div>
            </ExternalLink>
            <Show when={!isUndefined(mainRepo()!.github_data)}>
              <div class="mb-2">
                <div class={`badge border rounded-0 ${styles.badgeOutlineDark} ${styles.miniBadge}`}>
                  {mainRepo()!.github_data!.license}
                </div>
              </div>
            </Show>

            <Show when={!isUndefined(mainRepo()!.github_data)}>
              <div class="row g-4 my-0 mx-1 mb-2 justify-content-center">
                <Box class="col-6" value={prettifyNumber(mainRepo()!.github_data!.stars, 1)} legend="Stars" />

                <Box
                  class="col-6"
                  value={prettifyNumber(mainRepo()!.github_data!.contributors.count)}
                  legend="Contributors"
                />

                <Box class="col-6" value={formatDate(mainRepo()!.github_data!.first_commit.ts)} legend="First commit" />

                <Box
                  class="col-6"
                  value={formatDate(mainRepo()!.github_data!.latest_commit.ts)}
                  legend="Latest commit"
                />

                <Box
                  class="col-6"
                  value={
                    !isUndefined(mainRepo()!.github_data!.latest_release)
                      ? formatDate(mainRepo()!.github_data!.latest_release!.ts)
                      : '-'
                  }
                  legend="Latest release"
                />
              </div>

              <Show when={!isUndefined(mainRepo()!.github_data!.participation_stats)}>
                <div class="mt-4">
                  <div class={`fw-semibold ${styles.subtitleInSection}`}>Participation stats</div>
                  <div class="mx-2">
                    <ParticipationStats initialStats={mainRepo()!.github_data!.participation_stats} />
                  </div>
                </div>
              </Show>

              <Show
                when={!isUndefined(mainRepo()!.github_data!.languages) && !isEmpty(mainRepo()!.github_data!.languages)}
              >
                <div class="mt-4">
                  <div class={`fw-semibold ${styles.subtitleInSection}`}>Languages</div>
                  <LanguagesStats
                    initialLanguages={mainRepo()!.github_data!.languages!}
                    boxClass="col-6"
                    class="mx-1"
                  />
                </div>
              </Show>
            </Show>
          </Show>
        </Show>

        {/* Security audits */}
        <Show when={!isUndefined(itemInfo()!.audits) && !isEmpty(itemInfo()!.audits)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${styles.sectionTitle}`}>Security audits</div>
          <div class="w-100">
            <table class={`table table-sm table-striped table-bordered mt-3 ${styles.tableLayout}`}>
              <thead class={`text-uppercase text-muted ${styles.thead}`}>
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
                      <tr class={styles.tableContent}>
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
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${styles.sectionTitle}`}>Organization</div>
          <div class={`fw-semibold text-truncate my-2 ${styles.text}`}>{itemInfo()!.crunchbase_data!.name}</div>
          <div class="d-flex flex-row align-items-center">
            <Show when={!isUndefined(itemInfo()!.crunchbase_data!.kind)}>
              <div
                class={`me-2 badge rounded-0 text-dark text-uppercase border ${styles.badgeOutlineDark} ${styles.miniBadge}`}
              >
                {itemInfo()!.crunchbase_data!.kind}
              </div>
            </Show>
            <Show when={!isUndefined(itemInfo()!.crunchbase_data!.company_type)}>
              <div
                class={`me-2 badge rounded-0 text-dark text-uppercase border ${styles.badgeOutlineDark} ${styles.miniBadge}`}
              >
                {formatProfitLabel(itemInfo()!.crunchbase_data!.company_type!)}
              </div>
            </Show>
          </div>
          <Show
            when={!isUndefined(itemInfo()!.crunchbase_data!.city) || !isUndefined(itemInfo()!.crunchbase_data!.country)}
          >
            <div class={`text-muted py-2 ${styles.location}`}>
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
            <FundingRoundsTable
              rounds={itemInfo()!.crunchbase_data!.funding_rounds!}
              titleClassName={styles.titleInSection}
            />
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
              titleClassName={styles.titleInSection}
            />
          </Show>
        </Show>

        {/* Summary */}
        <Show when={!isUndefined(itemInfo()!.summary)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${styles.sectionTitle}`}>Summary</div>
          <div class={`my-2 ${styles.summary}`}>
            <Show when={!isUndefined(itemInfo()!.summary!.intro_url) && !isEmpty(itemInfo()!.summary!.intro_url)}>
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Introduction</div>
                <div class={`mt-2 text-truncate ${styles.summaryContent}`}>{itemInfo()!.summary!.intro_url!}</div>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.use_case) && !isEmpty(itemInfo()!.summary!.use_case)}>
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Use case</div>
                <div class={`mt-2 ${styles.summaryContent}`}>{itemInfo()!.summary!.use_case!}</div>
              </div>
            </Show>

            <Show
              when={
                !isUndefined(itemInfo()!.summary!.business_use_case) && !isEmpty(itemInfo()!.summary!.business_use_case)
              }
            >
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Business use case</div>
                <div class={`mt-2 ${styles.summaryContent}`}>{itemInfo()!.summary!.business_use_case!}</div>
              </div>
            </Show>

            <Show
              when={
                (!isUndefined(itemInfo()!.summary!.integrations) || !isUndefined(itemInfo()!.summary!.integration)) &&
                !isEmpty(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)
              }
            >
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Integrations</div>
                <div class={`mt-2 ${styles.summaryContent}`}>
                  {(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)!}
                </div>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.release_rate) && !isEmpty(itemInfo()!.summary!.release_rate)}>
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Release rate</div>
                <div class={`mt-2 ${styles.summaryContent}`}>{itemInfo()!.summary!.release_rate!}</div>
              </div>
            </Show>

            <Show
              when={!isUndefined(itemInfo()!.summary!.personas) && !isEmpty(compact(itemInfo()!.summary!.personas!))}
            >
              {' '}
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Personas</div>
                <For each={compact(itemInfo()!.summary!.personas!)}>
                  {(persona) => {
                    return <Badge text={persona} class={`me-2 mt-2 ${styles.summaryBadge}`} />;
                  }}
                </For>
              </div>
            </Show>

            <Show when={!isUndefined(itemInfo()!.summary!.tags) && !isEmpty(compact(itemInfo()!.summary!.tags!))}>
              <div class={styles.summaryBlock}>
                <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Tags</div>
                <For each={compact(itemInfo()!.summary!.tags!)}>
                  {(tag) => {
                    return <Badge text={tag} class={`me-2 mt-2 ${styles.summaryBadge}`} />;
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* CLOMonitor */}
        <Show when={!isUndefined(itemInfo()!.clomonitor_name)}>
          <div class={`text-uppercase mt-3 fw-semibold border-bottom ${styles.sectionTitle}`}>
            CLOMonitor report summary
          </div>

          <div class="my-2 d-flex justify-content-center w-100 align-items-center">
            <ExternalLink
              href={`https://clomonitor.io/projects/${window.baseDS.foundation.toLowerCase()}/${itemInfo()!
                .clomonitor_name!}`}
            >
              <Image
                name={`CLOMonitor report summary for ${itemInfo()!.name}`}
                logo={itemInfo()!.clomonitor_report_summary!}
                class={styles.clomonitorReport}
              />
            </ExternalLink>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default MobileContent;

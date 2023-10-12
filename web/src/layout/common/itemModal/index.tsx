import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import moment from 'moment';
import { createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';

import { Item, Repository, SecurityAudit, SVGIconKind } from '../../../types';
import formatProfitLabel from '../../../utils/formatLabelProfit';
import getItemDescription from '../../../utils/getItemDescription';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { formatTAGName } from '../../../utils/prepareFilters';
import prettifyNumber from '../../../utils/prettifyNumber';
import sortObjectByValue from '../../../utils/sortObjectByValue';
import { useActiveItemId, useSetActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import Badge from '../Badge';
import CollapsableText from '../CollapsableText';
import ExternalLink from '../ExternalLink';
import FoundationBadge from '../FoundationBadge';
import Image from '../Image';
import { Loading } from '../Loading';
import MaturityBadge from '../MaturityBadge';
import Modal from '../Modal';
import SVGIcon from '../SVGIcon';
import Box from './Box';
import styles from './ItemModal.module.css';
import LanguagesStats from './LanguagesStats';
import MaturitySection from './MaturitySection';
import ParticipationStats from './ParticipationStats';

const ItemModal = () => {
  const fullDataReady = useFullDataReady();
  const visibleItemId = useActiveItemId();
  const updateActiveItemId = useSetActiveItemId();
  const [itemInfo, setItemInfo] = createSignal<Item | null | undefined>(undefined);
  const [description, setDescription] = createSignal<string>();
  const [mainRepo, setMainRepo] = createSignal<Repository>();
  const [websiteUrl, setWebsiteUrl] = createSignal<string>();

  const formatDate = (date: string): string => {
    return moment(date).format("MMM 'YY");
  };

  createEffect(() => {
    async function fetchItemInfo() {
      try {
        const itemTmp = await itemsDataGetter.findById(visibleItemId()! as string);
        let mainRepoTmp: Repository | undefined;
        let websiteUrlTmp: string | undefined;
        if (!isUndefined(itemTmp)) {
          websiteUrlTmp = itemTmp.homepage_url;
          setWebsiteUrl(itemTmp.homepage_url);
          setDescription(getItemDescription(itemTmp));
          if (itemTmp.repositories) {
            itemTmp.repositories.forEach((repo: Repository) => {
              if (repo.primary) {
                mainRepoTmp = repo;
              }
            });

            if (mainRepoTmp) {
              setMainRepo(mainRepoTmp);
            }
          }

          // If homepage_url is undefined or is equal to main repository url
          // and maturity field is undefined,
          // we use the homepage_url fron crunchbase
          if (itemTmp && (isUndefined(websiteUrlTmp) || (mainRepoTmp && websiteUrlTmp === mainRepoTmp.url))) {
            if (itemTmp.crunchbase_data && itemTmp.crunchbase_data.homepage_url) {
              setWebsiteUrl(itemTmp.crunchbase_data.homepage_url);
            }
          }
          setItemInfo(itemTmp);
        } else {
          setItemInfo(null);
          setMainRepo(undefined);
          setDescription(undefined);
          setWebsiteUrl(undefined);
        }
      } catch {
        setItemInfo(null);
        setMainRepo(undefined);
        setDescription(undefined);
        setWebsiteUrl(undefined);
      }
    }

    if (visibleItemId() && fullDataReady()) {
      fetchItemInfo();
    } else {
      setItemInfo(undefined);
      setMainRepo(undefined);
      setDescription(undefined);
      setWebsiteUrl(undefined);
    }
  });

  return (
    <Show when={!isUndefined(visibleItemId())}>
      <Modal size="xl" open modalDialogClass={styles.modalDialog} onClose={() => updateActiveItemId()}>
        <Show
          when={!isUndefined(itemInfo()) && !isNull(itemInfo())}
          fallback={
            <div class={`d-flex flex-column p-5 ${styles.loadingWrapper}`}>
              <Loading />
            </div>
          }
        >
          <div class="d-flex flex-column p-3">
            <div class="d-flex flex-row align-items-center">
              <div class={`d-flex align-items-center justify-content-center ${styles.logoWrapper}`}>
                <Image name={itemInfo()!.name} class={`m-auto ${styles.logo}`} logo={itemInfo()!.logo} />
              </div>

              <div class={`d-flex flex-column justify-content-between ms-3 ${styles.itemInfo}`}>
                <div class="d-flex flex-row align-items-center me-3">
                  <div class={`fw-semibold text-truncate pe-2 ${styles.title}`}>{itemInfo()!.name}</div>
                  <div class={`d-flex flex-row align-items-center ms-2 ${styles.extra}`}>
                    <Show when={!isUndefined(itemInfo()!.maturity)}>
                      <FoundationBadge />
                      <MaturityBadge level={itemInfo()!.maturity!} class="mx-2" />

                      <Show when={!isUndefined(itemInfo()!.tag)}>
                        <div
                          class={`badge text-uppercase border rounded-0 me-2 ${styles.badgeOutlineDark} ${styles.tagBadge}`}
                        >
                          TAG {formatTAGName(itemInfo()!.tag!)}
                        </div>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.accepted_at)}>
                        <div
                          title={`Accepted at ${itemInfo()!.accepted_at}`}
                          class="d-flex flex-row align-items-center accepted-date me-3"
                        >
                          <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
                          <div>
                            <small>{itemInfo()!.accepted_at!.split('-')[0]}</small>
                          </div>
                        </div>
                      </Show>
                    </Show>
                  </div>
                </div>
                <Show when={!isUndefined(itemInfo()!.crunchbase_data) && itemInfo()!.crunchbase_data!.name}>
                  <div class={`text-muted text-truncate ${styles.name}`}>
                    <small>{itemInfo()!.crunchbase_data!.name}</small>
                  </div>
                </Show>
                <div class="d-flex flex-row align-items-center mb-1">
                  <div class={`d-none d-xl-flex badge border rounded-0 ${styles.badgeOutlineDark}`}>
                    {itemInfo()!.category}
                  </div>
                  <div class={`badge border ms-0 ms-xl-2 me-3 rounded-0 ${styles.badgeOutlineDark}`}>
                    {itemInfo()!.subcategory}
                  </div>
                  <div class="ms-auto">
                    <div class={`d-flex flex-row align-items-center ${styles.extra}`}>
                      <Show when={!isUndefined(websiteUrl())}>
                        <ExternalLink title="Website" class={`ms-3 ${styles.link}`} href={websiteUrl()!}>
                          <SVGIcon kind={SVGIconKind.World} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(mainRepo())}>
                        <ExternalLink title="Repository" class={`ms-3 ${styles.link}`} href={mainRepo()!.url}>
                          <SVGIcon kind={SVGIconKind.GitHubCircle} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.devstats_url)}>
                        <ExternalLink title="Devstats" class={`ms-3 ${styles.link}`} href={itemInfo()!.devstats_url!}>
                          <SVGIcon kind={SVGIconKind.Stats} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.twitter_url)}>
                        <ExternalLink title="Twitter" class={`ms-3 ${styles.link}`} href={itemInfo()!.twitter_url!}>
                          <SVGIcon kind={SVGIconKind.Twitter} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.youtube_url)}>
                        <ExternalLink title="Youtube" class={`ms-3 ${styles.link}`} href={itemInfo()!.youtube_url!}>
                          <SVGIcon kind={SVGIconKind.Youtube} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.slack_url)}>
                        <ExternalLink title="Slack" class={`ms-3 ${styles.link}`} href={itemInfo()!.slack_url!}>
                          <SVGIcon kind={SVGIconKind.Slack} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.discord_url)}>
                        <ExternalLink title="Discord" class={`ms-3 ${styles.link}`} href={itemInfo()!.discord_url!}>
                          <SVGIcon kind={SVGIconKind.Discord} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.docker_url)}>
                        <ExternalLink title="Docker" class={`ms-3 ${styles.link}`} href={itemInfo()!.docker_url!}>
                          <SVGIcon kind={SVGIconKind.Docker} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.stack_overflow_url)}>
                        <ExternalLink
                          title="Stack overflow"
                          class={`ms-3 ${styles.link}`}
                          href={itemInfo()!.stack_overflow_url!}
                        >
                          <SVGIcon kind={SVGIconKind.StackOverflow} />
                        </ExternalLink>
                      </Show>

                      <Show when={isUndefined(itemInfo()!.maturity) && !isUndefined(itemInfo()!.crunchbase_url)}>
                        <ExternalLink
                          title="Crunchbase"
                          class={`ms-3 ${styles.link}`}
                          href={itemInfo()!.crunchbase_url!}
                        >
                          <SVGIcon kind={SVGIconKind.Crunchbase} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.blog_url)}>
                        <ExternalLink title="Blog" class={`ms-3 ${styles.link}`} href={itemInfo()!.blog_url!}>
                          <SVGIcon kind={SVGIconKind.Blog} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.mailing_list_url)}>
                        <ExternalLink
                          title="Mailing list"
                          class={`ms-3 ${styles.link}`}
                          href={itemInfo()!.mailing_list_url!}
                        >
                          <SVGIcon kind={SVGIconKind.MailingList} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.openssf_best_practices_url)}>
                        <ExternalLink
                          title="OpenSSF best practices"
                          class={`ms-3 ${styles.link}`}
                          href={itemInfo()!.openssf_best_practices_url!}
                        >
                          <SVGIcon kind={SVGIconKind.OpenssfBestPractices} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.artwork_url)}>
                        <ExternalLink title="Artwork" class={`ms-3 ${styles.link}`} href={itemInfo()!.artwork_url!}>
                          <SVGIcon kind={SVGIconKind.Artwork} />
                        </ExternalLink>
                      </Show>

                      <Show when={!isUndefined(itemInfo()!.github_discussions_url)}>
                        <ExternalLink
                          title="Github discussions"
                          class={`ms-3 ${styles.link}`}
                          href={itemInfo()!.github_discussions_url!}
                        >
                          <SVGIcon kind={SVGIconKind.Discussions} />
                        </ExternalLink>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Description */}
            <div class={`mt-4 text-muted ${styles.description}`}>{description()}</div>
            {/* Maturity */}
            <MaturitySection item={itemInfo()!} class={styles.fieldset} />
            {/* Repositories */}
            <Show when={!isUndefined(itemInfo()!.repositories)}>
              <div class={`position-relative border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Repositories</div>
                <Show when={!isUndefined(mainRepo())}>
                  <div class={`fw-bold text-uppercase mt-2 mb-3 ${styles.titleInSection}`}>Primary repository</div>
                  <div class="d-flex flex-row align-items-center my-2">
                    <ExternalLink class="text-reset p-0 align-baseline fw-semibold" href={mainRepo()!.url}>
                      {mainRepo()!.url}
                    </ExternalLink>
                    <Show when={!isUndefined(mainRepo()!.github_data)}>
                      <div class={`ms-3 badge border rounded-0 ${styles.badgeOutlineDark} ${styles.miniBadge}`}>
                        {mainRepo()!.github_data!.license}
                      </div>
                    </Show>
                  </div>
                  <Show when={!isUndefined(mainRepo()!.github_data)}>
                    <div class="row g-4 my-0 mb-2">
                      <Box value={prettifyNumber(mainRepo()!.github_data!.stars, 1)} legend="Stars" />

                      <Box value={prettifyNumber(mainRepo()!.github_data!.contributors.count)} legend="Contributors" />

                      <Box value={formatDate(mainRepo()!.github_data!.first_commit.ts)} legend="First commit" />

                      <Box value={formatDate(mainRepo()!.github_data!.latest_commit.ts)} legend="Latest commit" />

                      <Box
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
                        <ParticipationStats initialStats={mainRepo()!.github_data!.participation_stats} />
                      </div>
                    </Show>

                    <Show
                      when={
                        !isUndefined(mainRepo()!.github_data!.languages) && !isEmpty(mainRepo()!.github_data!.languages)
                      }
                    >
                      <div class="mt-4">
                        <div class={`fw-semibold ${styles.subtitleInSection}`}>Languages</div>
                        <LanguagesStats initialLanguages={mainRepo()!.github_data!.languages!} />
                      </div>
                    </Show>
                  </Show>
                </Show>
                <Show when={!isUndefined(itemInfo()!.repositories) && itemInfo()!.repositories!.length > 1}>
                  <div class="mt-4">
                    <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Other repositories</div>
                    <table class={`table table-sm table-striped table-bordered mt-3 ${styles.tableLayout}`}>
                      <thead class={`text-uppercase text-muted ${styles.thead}`}>
                        <tr>
                          <th class="text-center" scope="col">
                            URL
                          </th>
                          <th class={`text-center ${styles.reposCol}`} scope="col">
                            Language
                          </th>
                          <th class={`text-center text-nowrap ${styles.reposCol}`} scope="col">
                            Latest commit
                          </th>
                          <th class={`text-center ${styles.reposCol}`} scope="col">
                            Stars
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={itemInfo()!.repositories}>
                          {(repo: Repository) => {
                            const languages =
                              repo.github_data && repo.github_data.languages
                                ? sortObjectByValue(repo.github_data.languages)
                                : undefined;

                            return (
                              <Show when={!repo.primary}>
                                <tr class={styles.tableContent}>
                                  <td class="px-3">
                                    <ExternalLink
                                      class={`text-muted text-truncate d-block ${styles.tableLink}`}
                                      href={repo.url}
                                    >
                                      {repo.url}
                                    </ExternalLink>
                                  </td>
                                  <td class="px-3 text-center text-nowrap">
                                    {!isUndefined(languages) && languages.length > 0 ? languages[0] : '-'}
                                  </td>
                                  <td class="px-3 text-center text-nowrap">
                                    {repo.github_data && repo.github_data.latest_commit
                                      ? formatDate(repo.github_data!.latest_commit!.ts)
                                      : '-'}
                                  </td>
                                  <td class="px-3 text-center text-nowrap">
                                    {repo.github_data && repo.github_data.stars
                                      ? prettifyNumber(repo.github_data.stars)
                                      : '-'}
                                  </td>
                                </tr>
                              </Show>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            </Show>
            {/* Security audits */}
            <Show when={!isUndefined(itemInfo()!.audits) && !isEmpty(itemInfo()!.audits)}>
              <div class={`position-relative border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Security audits</div>
                <div class="w-100">
                  <table class={`table table-sm table-striped table-bordered mt-3 ${styles.tableLayout}`}>
                    <thead class={`text-uppercase text-muted ${styles.thead}`}>
                      <tr>
                        <th class={`text-center ${styles.auditsCol}`} scope="col">
                          Date
                        </th>
                        <th class={`text-center ${styles.auditsCol}`} scope="col">
                          Type
                        </th>
                        <th class={`text-center ${styles.auditsColMd}`} scope="col">
                          Vendor
                        </th>
                        <th class="text-center" scope="col">
                          Url
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={sortBy(itemInfo()!.audits, 'date').reverse()}>
                        {(audit: SecurityAudit) => {
                          return (
                            <tr class={styles.tableContent}>
                              <td class="px-3 text-center text-nowrap">{audit.date}</td>
                              <td class="px-3 text-center text-uppercase">{audit.type}</td>
                              <td class="px-3 text-center text-nowrap">
                                <div class="w-100 text-truncate">{audit.vendor}</div>
                              </td>
                              <td class="px-3">
                                <div class="w-100">
                                  <ExternalLink
                                    class={`text-muted text-truncate d-block ${styles.tableLink}`}
                                    href={audit.url}
                                  >
                                    {audit.url}
                                  </ExternalLink>
                                </div>
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
            {/* Organization */}
            <Show when={!isUndefined(itemInfo()!.crunchbase_data)}>
              <div class={`position-relative border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Organization</div>
                <div class="d-flex flex-row align-items-center">
                  <div class={`fw-semibold text-truncate fs-6`}>{itemInfo()!.crunchbase_data!.name}</div>

                  {!isUndefined(itemInfo()!.crunchbase_data!.kind) && (
                    <div
                      class={`ms-3 badge rounded-0 text-dark text-uppercase border ${styles.badgeOutlineDark} ${styles.miniBadge}`}
                    >
                      {itemInfo()!.crunchbase_data!.kind}
                    </div>
                  )}
                  {!isUndefined(itemInfo()!.crunchbase_data!.company_type) && (
                    <div
                      class={`ms-3 badge rounded-0 text-dark text-uppercase border ${styles.badgeOutlineDark} ${styles.miniBadge}`}
                    >
                      {formatProfitLabel(itemInfo()!.crunchbase_data!.company_type!)}
                    </div>
                  )}
                </div>
                <div class={`text-muted pt-1 ${styles.location}`}>
                  {itemInfo()!.crunchbase_data!.city}
                  {!isUndefined(itemInfo()!.crunchbase_data!.country)
                    ? `, ${itemInfo()!.crunchbase_data!.country}`
                    : ''}
                </div>
                <div class="mt-3">
                  <small class="text-muted">{itemInfo()!.crunchbase_data!.description}</small>
                </div>
                <div class="row g-4 my-0 mb-2">
                  <Box
                    value={
                      !isUndefined(itemInfo()!.crunchbase_data!.funding)
                        ? prettifyNumber(itemInfo()!.crunchbase_data!.funding!)
                        : '-'
                    }
                    legend="Funding"
                  />

                  <Box
                    value={
                      <Switch>
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

                  <Box value={itemInfo()!.crunchbase_data!.stock_exchange! || '-'} legend="Stock exchange" />

                  <Box value={itemInfo()!.crunchbase_data!.ticker || '-'} legend="Ticker" />
                </div>
              </div>
            </Show>
            {/* Summary */}
            <Show when={!isUndefined(itemInfo()!.summary)}>
              <div class={`position-relative border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Summary</div>
                <div class={`my-2 ${styles.summary}`}>
                  <Show when={!isUndefined(itemInfo()!.summary!.intro_url) && !isEmpty(itemInfo()!.summary!.intro_url)}>
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Introduction</div>
                      <div class={`mt-2 ${styles.summaryContent}`}>{itemInfo()!.summary!.intro_url!}</div>
                    </div>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.summary!.use_case) && !isEmpty(itemInfo()!.summary!.use_case)}>
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Use case</div>
                      <div class={`mt-2 ${styles.summaryContent}`}>
                        <CollapsableText text={itemInfo()!.summary!.use_case!} />
                      </div>
                    </div>
                  </Show>

                  <Show
                    when={
                      !isUndefined(itemInfo()!.summary!.business_use_case) &&
                      !isEmpty(itemInfo()!.summary!.business_use_case)
                    }
                  >
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Business use case</div>
                      <div class={`mt-2 ${styles.summaryContent}`}>
                        <CollapsableText text={itemInfo()!.summary!.business_use_case!} />
                      </div>
                    </div>
                  </Show>

                  <Show
                    when={
                      (!isUndefined(itemInfo()!.summary!.integrations) ||
                        !isUndefined(itemInfo()!.summary!.integration)) &&
                      !isEmpty(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)
                    }
                  >
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Integrations</div>
                      <div class={`mt-2 ${styles.summaryContent}`}>
                        <CollapsableText
                          text={(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)!}
                        />
                      </div>
                    </div>
                  </Show>

                  <Show
                    when={
                      !isUndefined(itemInfo()!.summary!.release_rate) && !isEmpty(itemInfo()!.summary!.release_rate)
                    }
                  >
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Release rate</div>
                      <div class={`mt-2 ${styles.summaryContent}`}>
                        <CollapsableText text={itemInfo()!.summary!.release_rate!} />
                      </div>
                    </div>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.summary!.personas) && !isEmpty(itemInfo()!.summary!.personas)}>
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Personas</div>
                      <For each={itemInfo()!.summary!.personas!}>
                        {(persona) => {
                          return <Badge text={persona} class="me-2 mt-2" />;
                        }}
                      </For>
                    </div>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.summary!.tags) && !isEmpty(compact(itemInfo()!.summary!.tags!))}>
                    <div class={styles.summaryBlock}>
                      <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Tags</div>
                      <For each={compact(itemInfo()!.summary!.tags!)}>
                        {(tag) => {
                          return <Badge text={tag} class="me-2 mt-2" />;
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* CLOMonitor */}
            <Show when={!isUndefined(itemInfo()!.clomonitor_name)}>
              <div class={`position-relative border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>
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
                    />
                  </ExternalLink>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

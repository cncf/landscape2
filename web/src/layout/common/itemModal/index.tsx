import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { createEffect, createSignal, For, Show } from 'solid-js';

import { Item, Repository, SVGIconKind } from '../../../types';
import formatProfitLabel from '../../../utils/formatLabelProfit';
import getItemDescription from '../../../utils/getItemDescription';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import prettifyNumber from '../../../utils/prettifyNumber';
import { useActiveItemId, useSetActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import ExternalLink from '../ExternalLink';
import FoundationBadge from '../FoundationBadge';
import Image from '../Image';
import { Loading } from '../Loading';
import MaturityBadge from '../MaturityBadge';
import Modal from '../Modal';
import SVGIcon from '../SVGIcon';
import styles from './ItemModal.module.css';
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
          setItemInfo(itemTmp);
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
        } else {
          setItemInfo(null);
        }
      } catch {
        setItemInfo(null);
      }
    }

    if (visibleItemId() && fullDataReady()) {
      fetchItemInfo();
    } else {
      setItemInfo(undefined);
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

                      {!isUndefined(itemInfo()!.accepted_at) && (
                        <div
                          title={`Accepted at ${itemInfo()!.accepted_at}`}
                          class="d-flex flex-row align-items-center accepted-date me-3"
                        >
                          <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
                          <div>
                            <small>{itemInfo()!.accepted_at!.split('-')[0]}</small>
                          </div>
                        </div>
                      )}
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
            <div class={`mb-3 mt-4 text-muted ${styles.description}`}>{description()}</div>

            {/* Maturity */}
            <MaturitySection item={itemInfo()!} />

            {/* Repositories */}
            <Show when={!isUndefined(itemInfo()!.repositories)}>
              <div class={`position-relative my-4 border ${styles.fieldset}`}>
                <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Repositories</div>
                <Show when={!isUndefined(mainRepo())}>
                  <div>
                    <small class="text-muted">Primary repository:</small>
                  </div>
                  <div class="d-flex flex-row align-items-center my-2">
                    <ExternalLink class="text-reset p-0 align-baseline fw-semibold" href={mainRepo()!.url}>
                      {mainRepo()!.url}
                    </ExternalLink>
                    {!isUndefined(mainRepo()!.github_data) && (
                      <div class={`ms-3 badge border rounded-0 ${styles.badgeOutlineDark} ${styles.miniBadge}`}>
                        {mainRepo()!.github_data!.license}
                      </div>
                    )}
                  </div>
                  <Show when={!isUndefined(mainRepo()!.github_data)}>
                    <div class="row g-4 my-0 mb-2">
                      <div class="col">
                        <div
                          class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                        >
                          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                            {prettifyNumber(mainRepo()!.github_data!.stars, 1)}
                          </div>
                          <div class={`fw-semibold ${styles.highlightedLegend}`}>
                            <small>Stars</small>
                          </div>
                        </div>
                      </div>

                      <div class="col">
                        <div
                          class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                        >
                          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                            {prettifyNumber(mainRepo()!.github_data!.contributors.count)}
                          </div>
                          <div class={`fw-semibold ${styles.highlightedLegend}`}>
                            <small>Contributors</small>
                          </div>
                        </div>
                      </div>

                      <div class="col">
                        <div
                          class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                        >
                          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                            {formatDate(mainRepo()!.github_data!.first_commit.ts)}
                          </div>
                          <div class={`fw-semibold ${styles.highlightedLegend}`}>
                            <small>First commit</small>
                          </div>
                        </div>
                      </div>

                      <div class="col">
                        <div
                          class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                        >
                          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                            {formatDate(mainRepo()!.github_data!.latest_commit.ts)}
                          </div>
                          <div class={`fw-semibold ${styles.highlightedLegend}`}>
                            <small>Latest commit</small>
                          </div>
                        </div>
                      </div>

                      <div class="col">
                        <div
                          class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                        >
                          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                            {!isUndefined(mainRepo()!.github_data!.latest_release)
                              ? formatDate(mainRepo()!.github_data!.latest_release!.ts)
                              : '-'}
                          </div>
                          <div class={`fw-semibold ${styles.highlightedLegend}`}>
                            <small>Latest release</small>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isUndefined(mainRepo()!.github_data!.participation_stats) && (
                      <div class="mt-4">
                        <small class="text-muted">Participation stats:</small>
                        <ParticipationStats initialStats={mainRepo()!.github_data!.participation_stats} />
                      </div>
                    )}
                  </Show>
                </Show>
                <Show when={!isUndefined(itemInfo()!.repositories) && itemInfo()!.repositories!.length > 1}>
                  <div class="mt-4">
                    <small class="text-muted">Other repositories:</small>
                    <table class="table table-sm table-striped table-bordered mt-3">
                      <thead>
                        <tr>
                          <th class="text-center" scope="col">
                            URL
                          </th>
                          <th class="text-center" scope="col">
                            STARS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={itemInfo()!.repositories}>
                          {(repo: Repository) => {
                            if (repo.primary) return null;
                            return (
                              <tr class={styles.tableRepos}>
                                <td class="px-3">
                                  <ExternalLink class="text-muted" href={repo.url}>
                                    {repo.url}
                                  </ExternalLink>
                                </td>
                                <td class="px-3 text-center">
                                  {repo.github_data && repo.github_data.stars
                                    ? prettifyNumber(repo.github_data.stars)
                                    : '-'}
                                </td>
                              </tr>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Organization */}
            <Show when={!isUndefined(itemInfo()!.crunchbase_data)}>
              <div class={`position-relative mt-4 border ${styles.fieldset}`}>
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
                  <div class="col">
                    <div
                      class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                        {!isUndefined(itemInfo()!.crunchbase_data!.funding)
                          ? prettifyNumber(itemInfo()!.crunchbase_data!.funding!)
                          : '-'}
                      </div>
                      <div class={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Funding</small>
                      </div>
                    </div>
                  </div>

                  <div class="col">
                    <div
                      class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      {!isUndefined(itemInfo()!.crunchbase_data!.num_employees_min) &&
                      !isUndefined(itemInfo()!.crunchbase_data!.num_employees_max) ? (
                        <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                          {!isUndefined(itemInfo()!.crunchbase_data!.num_employees_min)
                            ? prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_min!)
                            : '-'}
                          -
                          {!isUndefined(itemInfo()!.crunchbase_data!.num_employees_max)
                            ? prettifyNumber(itemInfo()!.crunchbase_data!.num_employees_max!)
                            : '-'}
                        </div>
                      ) : (
                        <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>-</div>
                      )}
                      <div class={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Employees</small>
                      </div>
                    </div>
                  </div>

                  <div class="col">
                    <div
                      class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div class={`fw-bold text-uppercase text-nowrap ${styles.highlightedTitle}`}>
                        {!isUndefined(itemInfo()!.crunchbase_data!.stock_exchange)
                          ? itemInfo()!.crunchbase_data!.stock_exchange
                          : '-'}
                      </div>
                      <div class={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Stock exchange</small>
                      </div>
                    </div>
                  </div>

                  <div class="col">
                    <div
                      class={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>
                        {!isUndefined(itemInfo()!.crunchbase_data!.ticker) ? itemInfo()!.crunchbase_data!.ticker : '-'}
                      </div>
                      <div class={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Ticker</small>
                      </div>
                    </div>
                  </div>
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

import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import { css } from 'solid-styled-components';

import { AdditionalCategory, Item, Repository, SecurityAudit, SVGIconKind } from '../types/types';
import { cutString, getItemDescription } from '../utils';
import { formatProfitLabel } from '../utils/formatProfitLabel';
import { formatTAGName } from '../utils/formatTAGName';
import { prettifyNumber } from '../utils/prettifyNumber';
import { AcquisitionsTable } from './AcquisitionsTable';
import { Badge } from './Badge';
import { Box } from './Box';
import { CollapsableText } from './CollapsableText';
import { ExternalLink } from './ExternalLink';
import { FoundationBadge } from './FoundationBadge';
import { FundingRoundsTable } from './FundingRoundsTable';
import { Image } from './Image';
import { ItemDropdown } from './ItemDropdown';
import { MaturityBadge } from './MaturityBadge';
import { MaturitySection } from './MaturitySection';
import { ParentProject } from './ParentProject';
import { RepositoriesSection } from './RepositoriesSection';
import { SVGIcon } from './SVGIcon';

interface Props {
  item?: Item | null;
  parentInfo?: Item | null;
  foundation: string;
  basePath?: string;
  onClose?: () => void;
  membersCategory?: string;
}

const LogoWrapper = css`
  height: 120px;
  width: 100px;
  min-width: 100px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const ItemInfo = css`
  background-color: #f8f9fa;
  width: calc(100% - 100px - 1rem);
  height: 140px;
  padding: 1rem 1.5rem;
`;

const Title = css`
  font-size: 1.5rem;
  line-height: 1.75rem;
`;

const TitleInSection = css`
  font-size: 0.8rem;
  opacity: 0.5;
`;

const Name = css`
  padding-bottom: 5px;
`;

const Description = css`
  font-size: 0.9rem !important;
`;

const OtherLink = css`
  font-size: 0.75rem;
  color: var(--color4);
  max-width: calc(50% - 2rem - 15px);
  line-height: 24px;
`;

const BadgeOutlineDark = css`
  border: 1px solid var(--bs-gray-700);
  color: var(--bs-gray-700) !important;
`;

const TagBadge = css`
  height: 20px;
`;

const MiniBadge = css`
  font-size: 0.65rem !important;
`;

const Location = css`
  font-size: 0.8rem;
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
    margin-top: -4px;
  }
`;

const Fieldset = css`
  padding: 1.5rem 1.75rem;
  margin-top: 2rem;

  & + & {
    margin-top: 3rem;
  }
`;

const FieldsetTitle = css`
  font-size: 0.8rem;
  line-height: 0.8rem;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
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
    font-size: 0.8rem !important;
    line-height: 2;
  }
`;

const TableLink = css`
  font-size: 0.8rem !important;
`;

const AuditsCol = css`
  width: 120px;
`;

const AuditsColMd = css`
  width: 200px;
`;

const Summary = css`
  .summaryBlock + .summaryBlock {
    margin-top: 1.15rem;
  }
`;

const SummaryContent = css`
  font-size: 0.8rem !important;
`;

const SummaryBadge = css`
  background-color: var(--color-stats-1);
`;

const getPackageManagerIcon = (url: string): SVGIconKind => {
  const icon = SVGIconKind.PackageManager;
  const pkgManagerUrl = new URL(url);
  const pkgManagerHostname = pkgManagerUrl.hostname;

  if (pkgManagerHostname.includes('npmjs.com')) {
    return SVGIconKind.NPM;
  } else if (pkgManagerHostname.includes('pypi.org')) {
    return SVGIconKind.PyPi;
  } else if (pkgManagerHostname.includes('crates.io')) {
    return SVGIconKind.Rust;
  } else if (pkgManagerHostname.includes('cpan.org')) {
    return SVGIconKind.Perl;
  } else if (pkgManagerHostname.includes('rubygems.org')) {
    return SVGIconKind.RubyGems;
  } else if (pkgManagerHostname.includes('maven.apache.org')) {
    return SVGIconKind.MavenApache;
  } else if (pkgManagerHostname.includes('packagist.org')) {
    return SVGIconKind.Packagist;
  } else if (pkgManagerHostname.includes('cocoapods.org')) {
    return SVGIconKind.Cocoapods;
  } else if (pkgManagerHostname.includes('nuget.org')) {
    return SVGIconKind.Nuget;
  } else if (pkgManagerHostname.includes('pub.dev')) {
    return SVGIconKind.Flutter;
  } else if (pkgManagerHostname.includes('hex.pm')) {
    return SVGIconKind.Erlang;
  }

  return icon;
};

export const ItemModalContent = (props: Props) => {
  const itemInfo = () => props.item;
  const [description, setDescription] = createSignal<string>();
  const [primaryRepo, setPrimaryRepo] = createSignal<Repository>();

  createEffect(
    on(itemInfo, () => {
      if (!isUndefined(itemInfo()) && !isNull(itemInfo())) {
        let primaryRepoTmp: Repository | undefined;
        setDescription(getItemDescription(itemInfo()!));
        if (!isUndefined(itemInfo()!.repositories)) {
          itemInfo()!.repositories!.forEach((repo: Repository) => {
            if (repo.primary) {
              primaryRepoTmp = repo;
            }
          });

          if (primaryRepoTmp) {
            setPrimaryRepo(primaryRepoTmp);
          }
        }
      } else {
        setPrimaryRepo(undefined);
        setDescription(undefined);
        if (props.onClose) {
          props.onClose();
        }
      }
    })
  );

  const getLinkedInUrl = (): string | null => {
    if (itemInfo()) {
      if (itemInfo()!.linkedin_url) {
        return itemInfo()!.linkedin_url!;
      } else {
        if (itemInfo()!.crunchbase_data && itemInfo()!.crunchbase_data!.linkedin_url) {
          return itemInfo()!.crunchbase_data!.linkedin_url!;
        }
      }
    }
    return null;
  };

  return (
    <>
      <Show when={!isUndefined(props.basePath)}>
        <ItemDropdown itemId={itemInfo()!.id} foundation={props.foundation} basePath={props.basePath!} />
      </Show>
      <div class="d-flex flex-column p-3">
        <div class="d-flex flex-row align-items-center">
          <div class={`d-flex align-items-center justify-content-center ${LogoWrapper}`}>
            <Image name={itemInfo()!.name} class={`m-auto ${Logo}`} logo={itemInfo()!.logo} />
          </div>

          <div class={`d-flex flex-column justify-content-between ms-3 ${ItemInfo}`}>
            <div class="d-flex flex-row align-items-center me-5">
              <div class={`fw-semibold text-truncate pe-2 ${Title}`}>{itemInfo()!.name}</div>
              <div class="d-flex flex-row align-items-center ms-2">
                <Show when={!isUndefined(itemInfo()!.maturity)}>
                  <FoundationBadge foundation={props.foundation} />
                  <MaturityBadge level={itemInfo()!.maturity!} class="mx-2" />

                  <Show when={!isUndefined(itemInfo()!.tag)}>
                    <div class={`badge text-uppercase rounded-0 me-2 ${BadgeOutlineDark} ${TagBadge}`}>
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
                <Show when={!isUndefined(itemInfo()!.joined_at) && isUndefined(itemInfo()!.accepted_at)}>
                  <div
                    title={`Joined at ${itemInfo()!.joined_at}`}
                    class="d-flex flex-row align-items-center accepted-date me-3 mt-1"
                  >
                    <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
                    <div>
                      <small>{itemInfo()!.joined_at!.split('-')[0]}</small>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
            <Show when={!isUndefined(itemInfo()!.crunchbase_data) && itemInfo()!.crunchbase_data!.name}>
              <div class={`text-muted text-truncate ${Name}`}>
                <small>{itemInfo()!.crunchbase_data!.name}</small>
              </div>
            </Show>
            <div class="d-flex flex-row align-items-center mb-1">
              <div class={`d-none d-xl-flex badge rounded-0 ${BadgeOutlineDark}`}>{itemInfo()!.category}</div>
              <div class={`badge ms-0 ms-xl-2 rounded-0 ${BadgeOutlineDark}`}>{itemInfo()!.subcategory}</div>
              <Show
                when={
                  !isUndefined(itemInfo()!.enduser) &&
                  itemInfo()!.enduser &&
                  !isUndefined(props.membersCategory) &&
                  props.membersCategory === itemInfo()!.category
                }
              >
                <div class={`badge ms-0 ms-xl-2 me-3 rounded-0 ${BadgeOutlineDark}`}>End user</div>
              </Show>

              <div class="ms-auto">
                <div class="d-flex flex-row align-items-center">
                  <Show when={!isUndefined(props.item!.website)}>
                    <ExternalLink title="Website" class={`ms-3 ${Link}`} href={props.item!.website!}>
                      <SVGIcon kind={SVGIconKind.World} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(primaryRepo())}>
                    <ExternalLink title="Repository" class={`ms-3 ${Link}`} href={primaryRepo()!.url}>
                      <SVGIcon kind={SVGIconKind.GitHubCircle} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.devstats_url)}>
                    <ExternalLink title="Devstats" class={`ms-3 ${Link}`} href={itemInfo()!.devstats_url!}>
                      <SVGIcon kind={SVGIconKind.Stats} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.twitter_url)}>
                    <ExternalLink title="X (Twitter)" class={`ms-3 ${Link}`} href={itemInfo()!.twitter_url!}>
                      <SVGIcon kind={SVGIconKind.Twitter} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.youtube_url)}>
                    <ExternalLink title="Youtube" class={`ms-3 ${Link}`} href={itemInfo()!.youtube_url!}>
                      <SVGIcon kind={SVGIconKind.Youtube} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isNull(getLinkedInUrl())}>
                    <ExternalLink title="LinkedIn" class={`ms-3 ${Link}`} href={getLinkedInUrl()!}>
                      <SVGIcon kind={SVGIconKind.LinkedIn} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.slack_url)}>
                    <ExternalLink title="Slack" class={`ms-3 ${Link}`} href={itemInfo()!.slack_url!}>
                      <SVGIcon kind={SVGIconKind.Slack} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.discord_url)}>
                    <ExternalLink title="Discord" class={`ms-3 ${Link}`} href={itemInfo()!.discord_url!}>
                      <SVGIcon kind={SVGIconKind.Discord} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.docker_url)}>
                    <ExternalLink title="Docker" class={`ms-3 ${Link}`} href={itemInfo()!.docker_url!}>
                      <SVGIcon kind={SVGIconKind.Docker} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.stack_overflow_url)}>
                    <ExternalLink title="Stack overflow" class={`ms-3 ${Link}`} href={itemInfo()!.stack_overflow_url!}>
                      <SVGIcon kind={SVGIconKind.StackOverflow} />
                    </ExternalLink>
                  </Show>

                  <Show when={isUndefined(itemInfo()!.maturity) && !isUndefined(itemInfo()!.crunchbase_url)}>
                    <ExternalLink title="Crunchbase" class={`ms-3 ${Link}`} href={itemInfo()!.crunchbase_url!}>
                      <SVGIcon kind={SVGIconKind.Crunchbase} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.blog_url)}>
                    <ExternalLink title="Blog" class={`ms-3 ${Link}`} href={itemInfo()!.blog_url!}>
                      <SVGIcon kind={SVGIconKind.Blog} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.mailing_list_url)}>
                    <ExternalLink title="Mailing list" class={`ms-3 ${Link}`} href={itemInfo()!.mailing_list_url!}>
                      <SVGIcon kind={SVGIconKind.MailingList} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.openssf_best_practices_url)}>
                    <ExternalLink
                      title="OpenSSF best practices"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.openssf_best_practices_url!}
                    >
                      <SVGIcon kind={SVGIconKind.OpenssfBestPractices} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.artwork_url)}>
                    <ExternalLink title="Artwork" class={`ms-3 ${Link}`} href={itemInfo()!.artwork_url!}>
                      <SVGIcon kind={SVGIconKind.Artwork} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.github_discussions_url)}>
                    <ExternalLink
                      title="Github discussions"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.github_discussions_url!}
                    >
                      <SVGIcon kind={SVGIconKind.Discussions} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.documentation_url)}>
                    <ExternalLink title="Documenation" class={`ms-3 ${Link}`} href={itemInfo()!.documentation_url!}>
                      <SVGIcon kind={SVGIconKind.Book} />
                    </ExternalLink>
                  </Show>

                  <Show when={!isUndefined(itemInfo()!.package_manager_url)}>
                    <ExternalLink
                      title="Package manager"
                      class={`ms-3 ${Link}`}
                      href={itemInfo()!.package_manager_url!}
                    >
                      <SVGIcon kind={getPackageManagerIcon(itemInfo()!.package_manager_url!)} />
                    </ExternalLink>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Description */}
        <div class={`mt-4 text-muted ${Description}`}>{description()}</div>

        {/* Other links */}
        <Show when={!isUndefined(itemInfo()!.other_links)}>
          <div class="d-flex flex-row flex-wrap align-items-center mt-2">
            <For each={itemInfo()!.other_links}>
              {(link, index) => {
                return (
                  <>
                    <ExternalLink
                      href={link.url}
                      class={`fw-semibold text-nowrap d-inline-block text-truncate text-uppercase ${OtherLink}`}
                    >
                      {cutString(link.name, 30)}
                    </ExternalLink>
                    <Show when={index() !== itemInfo()!.other_links!.length - 1}>
                      <div class="mx-2">·</div>
                    </Show>
                  </>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Additional categories */}
        <Show when={!isUndefined(itemInfo()!.additional_categories) && !isEmpty(itemInfo()!.additional_categories)}>
          <div class={`fw-bold text-uppercase mt-4 mb-3 ${TitleInSection}`}>Additional categories</div>
          <div class="d-flex flex-row flex-wrap align-items-center mb-2">
            <For each={itemInfo()!.additional_categories}>
              {(additional: AdditionalCategory) => {
                return (
                  <div class={`badge rounded-0 me-2 mb-2 ${BadgeOutlineDark}`}>
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
            class={Fieldset}
            mobileVersion={false}
            foundation={props.foundation}
          />
        </Show>
        {/* Maturity */}
        <MaturitySection item={itemInfo()!} class={Fieldset} />
        {/* Repositories */}
        <RepositoriesSection
          repositories={itemInfo()!.repositories}
          class={`border ${Fieldset}`}
          titleClass={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}
        />
        {/* Security audits */}
        <Show when={!isUndefined(itemInfo()!.audits) && !isEmpty(itemInfo()!.audits)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Security audits</div>
            <div class="w-100">
              <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
                <thead class={`text-uppercase text-muted ${Thead}`}>
                  <tr>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      Date
                    </th>
                    <th class={`text-center ${AuditsCol}`} scope="col">
                      Type
                    </th>
                    <th class={`text-center ${AuditsColMd}`} scope="col">
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
                        <tr class={TableContent}>
                          <td class="px-3 text-center text-nowrap">{audit.date}</td>
                          <td class="px-3 text-center text-uppercase">{audit.type}</td>
                          <td class="px-3 text-center text-nowrap">
                            <div class="w-100 text-truncate">{audit.vendor}</div>
                          </td>
                          <td class="px-3">
                            <div class="w-100">
                              <ExternalLink
                                class={`text-muted text-truncate d-block text-decoration-underline ${TableLink}`}
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
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Organization</div>
            <div class="d-flex flex-row align-items-center">
              <div class={`fw-semibold text-truncate fs-6`}>{itemInfo()!.crunchbase_data!.name}</div>

              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.kind)}>
                <div class={`ms-3 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} ${MiniBadge}`}>
                  {itemInfo()!.crunchbase_data!.kind}
                </div>
              </Show>
              <Show when={!isUndefined(itemInfo()!.crunchbase_data!.company_type)}>
                <div class={`ms-3 badge rounded-0 text-dark text-uppercase ${BadgeOutlineDark} ${MiniBadge}`}>
                  {formatProfitLabel(itemInfo()!.crunchbase_data!.company_type!)}
                </div>
              </Show>
            </div>
            <Show
              when={
                !isUndefined(itemInfo()!.crunchbase_data!.city) ||
                !isUndefined(itemInfo()!.crunchbase_data!.region) ||
                !isUndefined(itemInfo()!.crunchbase_data!.country)
              }
            >
              <div class={`text-muted pt-1 ${Location}`}>
                <Show when={!isUndefined(itemInfo()!.crunchbase_data!.city)}>{itemInfo()!.crunchbase_data!.city}</Show>
                <Show
                  when={
                    !isUndefined(itemInfo()!.crunchbase_data!.city) &&
                    (!isUndefined(itemInfo()!.crunchbase_data!.region) ||
                      !isUndefined(itemInfo()!.crunchbase_data!.country))
                  }
                >
                  <>, </>
                </Show>

                <Show when={!isUndefined(itemInfo()!.crunchbase_data!.region)}>
                  {itemInfo()!.crunchbase_data!.region}
                </Show>
                <Show
                  when={
                    !isUndefined(itemInfo()!.crunchbase_data!.region) &&
                    !isUndefined(itemInfo()!.crunchbase_data!.country)
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

              <Box value={itemInfo()!.crunchbase_data!.stock_exchange! || '-'} legend="Stock exchange" />

              <Box value={itemInfo()!.crunchbase_data!.ticker || '-'} legend="Ticker" />
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
                titleClassName={TitleInSection}
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
                titleClassName={TitleInSection}
              />
            </Show>
          </div>
        </Show>
        {/* Summary */}
        <Show when={!isUndefined(itemInfo()!.summary)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Summary</div>
            <div class={`my-2 ${Summary}`}>
              <Show when={!isUndefined(itemInfo()!.summary!.intro_url) && !isEmpty(itemInfo()!.summary!.intro_url)}>
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Introduction</div>
                  <div class={`mt-2 ${SummaryContent}`}>{itemInfo()!.summary!.intro_url!}</div>
                </div>
              </Show>

              <Show when={!isUndefined(itemInfo()!.summary!.use_case) && !isEmpty(itemInfo()!.summary!.use_case)}>
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Use case</div>
                  <div class={`mt-2 ${SummaryContent}`}>
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
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Business use case</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={itemInfo()!.summary!.business_use_case!} />
                  </div>
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
                    <CollapsableText text={(itemInfo()!.summary!.integrations || itemInfo()!.summary!.integration)!} />
                  </div>
                </div>
              </Show>

              <Show
                when={!isUndefined(itemInfo()!.summary!.release_rate) && !isEmpty(itemInfo()!.summary!.release_rate)}
              >
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection}`}>Release rate</div>
                  <div class={`mt-2 ${SummaryContent}`}>
                    <CollapsableText text={itemInfo()!.summary!.release_rate!} />
                  </div>
                </div>
              </Show>

              <Show
                when={!isUndefined(itemInfo()!.summary!.personas) && !isEmpty(compact(itemInfo()!.summary!.personas!))}
              >
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
          </div>
        </Show>

        {/* CLOMonitor */}
        <Show when={!isUndefined(itemInfo()!.clomonitor_name) && !isUndefined(itemInfo()!.clomonitor_report_summary)}>
          <div class={`position-relative border ${Fieldset}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>CLOMonitor report summary</div>
            <div class="my-2 d-flex justify-content-center w-100 align-items-center">
              <ExternalLink
                href={`https://clomonitor.io/projects/${props.foundation.toLowerCase()}/${itemInfo()!
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
    </>
  );
};

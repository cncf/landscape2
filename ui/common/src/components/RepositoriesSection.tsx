import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import { createEffect, createMemo, createSignal, createUniqueId, For, on, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Repository } from '../types/datasets';
import { SVGIconKind } from '../types/types';
import { cx } from '../utils/cx';
import { formatMonthYear } from '../utils/dates';
import { prettifyNumber } from '../utils/prettifyNumber';
import { Box } from './Box';
import { ExternalLink } from './ExternalLink';
import { getGitHubRepoPath } from './itemModal/helpers';
import { BadgeOutlineDark, MiniBadge } from './itemModal/styles';
import { LanguagesStats } from './LanguagesStats';
import { ParticipationStats } from './ParticipationStats';
import { SVGIcon } from './SVGIcon';

interface Props {
  repositories?: Repository[];
  class?: string;
  projectMaturity?: string;
  titleClass?: string;
  boxClass?: string;
}

interface RepoProps {
  boxClass?: string;
  projectMaturity?: string;
  repository: Repository;
}

const SubtitleInSection = css`
  font-size: 0.8rem !important;
  opacity: 0.5;
`;

const Select = css`
  width: 500px !important;
  max-width: calc(100% - 0.4rem);
  box-shadow: 0 0 0 0.2rem var(--bs-gray-200);
  margin: 0 0.2rem;
  font-size: 0.8rem !important;

  &:focus {
    box-shadow: 0 0 0 0.2rem var(--bs-gray-200) !important;
  }
`;

const ExternalIcon = css`
  min-width: 24px;
`;

const RepoIcon = css`
  min-width: 24px;
`;

const LinkWrapper = css`
  max-width: 100%;
`;

const TruncateWrapper = css`
  min-width: 0;
  max-width: 100%;
`;

const LinkContentWrapper = css`
  max-width: calc(100% - 1.5rem);
`;

const GoodFirstBadge = css`
  height: 20px;

  img {
    max-height: 100%;
  }
`;

const Badges = css`
  row-gap: 0.5rem;
`;

/** Repositories of an item, primary first, with a select to switch the repository shown. */
export const RepositoriesSection = (props: Props) => {
  const selectId = createUniqueId();
  const repositories = createMemo(() =>
    orderBy(props.repositories ?? [], [(r: Repository) => (r.primary === true ? 0 : 1), 'url'], ['asc'])
  );
  const [selectedUrl, setSelectedUrl] = createSignal<string>();
  // A new repositories list starts again from its first repository
  createEffect(on(repositories, () => setSelectedUrl(undefined), { defer: true }));
  const selectedRepo = () => repositories().find((r) => r.url === selectedUrl()) ?? repositories()[0];

  return (
    <Show when={repositories().length > 0}>
      <div class={cx('position-relative', props.class)}>
        <h3 class={props.titleClass}>Repositories</h3>
        <label for={selectId} class="visually-hidden">
          Select repository
        </label>
        <select
          id={selectId}
          class={`form-select border-0 rounded-0 my-3 ${Select}`}
          value={selectedRepo()?.url}
          onChange={(e) => setSelectedUrl(e.currentTarget.value)}
        >
          <For each={repositories()}>
            {(repo: Repository) => (
              <option value={repo.url}>
                {formatRepoUrl(repo.url)}
                <Show when={repo.primary}> (primary)</Show>
              </option>
            )}
          </For>
        </select>

        <Show when={selectedRepo()}>
          {(repository) => (
            <RepositoryInfo
              boxClass={props.boxClass}
              projectMaturity={props.projectMaturity}
              repository={repository()}
            />
          )}
        </Show>
      </div>
    </Show>
  );
};

/** Details of the selected repository: url, badges, GitHub stats, participation and languages. */
const RepositoryInfo = (props: RepoProps) => {
  const repositoryLicense = () => props.repository.license ?? props.repository.github_data?.license;
  const gitHubRepoPath = () => getGitHubRepoPath(props.repository.url);
  const goodFirstIssuesPath = () => (props.projectMaturity !== 'archived' ? gitHubRepoPath() : null);

  return (
    <>
      <div class="d-flex flex-row align-items-start mt-4">
        <div class={`d-flex flex-column flex-md-row align-items-start align-items-md-center my-2 ${LinkWrapper}`}>
          <ExternalLink
            class={`text-reset p-0 align-items-center fw-semibold me-3 text-decoration-none ${TruncateWrapper}`}
            href={props.repository.url}
            externalIconClass={ExternalIcon}
            visibleExternalIcon
          >
            <div class={`d-none d-md-flex ${LinkContentWrapper}`}>
              <div class="text-truncate">{props.repository.url}</div>
            </div>
            <div class="d-flex d-md-none flex-row align-items-center text-truncate">
              <SVGIcon
                kind={gitHubRepoPath() !== null ? SVGIconKind.GitHub : SVGIconKind.Link}
                class={`me-1 ${RepoIcon}`}
              />
              <div class="text-truncate">{formatRepoUrl(props.repository.url)}</div>
            </div>
          </ExternalLink>
          <Show when={props.repository.primary || props.repository.github_data !== undefined}>
            <div class={`d-flex align-items-center flex-wrap flex-md-nowrap mt-2 mt-md-0 ${Badges}`}>
              <Show when={props.repository.primary}>
                <div class={`me-2 badge rounded-0 text-uppercase ${BadgeOutlineDark} ${MiniBadge}`}>Primary</div>
              </Show>
              <Show when={repositoryLicense()}>
                {(license) => <div class={`badge rounded-0 me-2 ${BadgeOutlineDark} ${MiniBadge}`}>{license()}</div>}
              </Show>
              <Show when={goodFirstIssuesPath()}>
                {(path) => (
                  <div class="d-none d-md-flex">
                    <ExternalLink
                      class={`d-flex ${GoodFirstBadge}`}
                      href={`https://github.com/${path()}/issues?q=is%3Aopen+is%3Aissue+label%3A"good+first+issue"`}
                    >
                      <img
                        src={`https://img.shields.io/github/issues/${path()}/good%20first%20issue.svg?style=flat-square&label=good%20first%20issues&labelColor=e9ecef&color=6c757d`}
                        alt="Good first issues count"
                      />
                    </ExternalLink>
                  </div>
                )}
              </Show>
            </div>
          </Show>
        </div>
      </div>
      <Show when={props.repository.github_data !== undefined}>
        <div class="row g-4 my-0 mb-2 justify-content-center justify-content-md-start">
          <Box
            class={props.boxClass}
            value={prettifyNumber(props.repository.github_data!.stars, 1)}
            legend="Stars"
            description="Stars number"
          />

          <Box
            class={props.boxClass}
            value={prettifyNumber(props.repository.github_data!.contributors.count)}
            legend="Contributors"
            description="Contributors number"
          />

          <Box
            class={props.boxClass}
            value={formatDate(props.repository.github_data!.first_commit?.ts)}
            legend="First commit"
            description="First commit date"
          />

          <Box
            class={props.boxClass}
            value={formatDate(props.repository.github_data!.latest_commit.ts)}
            legend="Latest commit"
            description="Latest commit date"
          />

          <Box
            class={props.boxClass}
            value={formatDate(props.repository.github_data!.latest_release?.ts)}
            legend="Latest release"
            description="Latest release date"
          />
        </div>

        <Show when={props.repository.github_data!.participation_stats !== undefined}>
          <div class="mt-4">
            <div class={`fw-semibold ${SubtitleInSection}`}>Participation stats</div>
            <div class="mx-2 mx-md-0">
              <ParticipationStats initialStats={props.repository.github_data!.participation_stats} />
            </div>
          </div>
        </Show>

        <Show when={!isEmpty(props.repository.github_data!.languages)}>
          <div class="mt-4">
            <div class={`fw-semibold ${SubtitleInSection}`}>Languages</div>
            <LanguagesStats initialLanguages={props.repository.github_data!.languages!} boxClass={props.boxClass} />
          </div>
        </Show>
      </Show>
    </>
  );
};

/** Returns the path of a repository url, without the leading and trailing slashes. */
const formatRepoUrl = (url: string): string => new URL(url).pathname.replace(/^\/+|\/+$/g, '');

/** Formats a commit or release date as its month and year, or `-` when it is unknown. */
const formatDate = (date?: string): string => (date === undefined ? '-' : formatMonthYear(date));

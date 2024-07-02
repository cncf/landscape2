import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import moment from 'moment';
import { createSignal, For, onMount, Show } from 'solid-js';

import { Repository, SVGIconKind } from '../../../types';
import prettifyNumber from '../../../utils/prettifyNumber';
import ExternalLink from '../ExternalLink';
import SVGIcon from '../SVGIcon';
import Box from './Box';
import LanguagesStats from './LanguagesStats';
import ParticipationStats from './ParticipationStats';
import styles from './RepositoriesSection.module.css';

interface Props {
  repositories?: Repository[];
  class?: string;
  titleClass?: string;
  boxClass?: string;
}

interface RepoProps {
  repository: Repository;
  boxClass?: string;
}

const formatRepoUrl = (url: string): string => {
  const repoUrl = new URL(url);
  return repoUrl.pathname.slice(1);
};

const RepositoryInfo = (props: RepoProps) => {
  const formatDate = (date: string): string => {
    return moment(date).format("MMM 'YY");
  };

  return (
    <>
      <div class="d-flex flex-row align-items-start mt-4">
        <div
          class={`d-flex flex-column flex-md-row align-items-start align-items-md-center my-2 ${styles.linkWrapper}`}
        >
          <ExternalLink
            class={`text-reset p-0 align-items-center fw-semibold me-3 ${styles.truncateWrapper}`}
            href={props.repository.url}
            externalIconClassName={styles.externalIcon}
            visibleExternalIcon
          >
            <div class={`d-none d-md-flex ${styles.linkContentWrapper}`}>
              <div class="text-truncate">{props.repository.url}</div>
            </div>
            <div class="d-flex d-md-none flex-row align-items-center text-truncate">
              <SVGIcon kind={SVGIconKind.GitHub} class={`me-1 ${styles.repoIcon}`} />
              <div class="text-truncate">{formatRepoUrl(props.repository.url)}</div>
            </div>
          </ExternalLink>
          <Show when={props.repository.primary || !isUndefined(props.repository.github_data)}>
            <div class={`d-flex align-items-center flex-wrap flex-md-nowrap mt-2 mt-md-0 ${styles.badges}`}>
              <Show when={props.repository.primary}>
                <div
                  class={`me-2 badge border rounded-0 text-uppercase ${styles.badgeOutlineDark} ${styles.miniBadge}`}
                >
                  Primary
                </div>
              </Show>
              <Show when={!isUndefined(props.repository.github_data)}>
                <div class={`badge border rounded-0 me-2 ${styles.badgeOutlineDark} ${styles.miniBadge}`}>
                  {props.repository.github_data!.license}
                </div>
              </Show>
              <div class="d-none d-md-flex">
                <ExternalLink
                  class={`d-flex ${styles.goodFirstBadge}`}
                  href={`https://github.com/${formatRepoUrl(props.repository.url)}/issues?q=is%3Aopen+is%3Aissue+label%3A"good+first+issue"`}
                >
                  <img
                    src={`https://img.shields.io/github/issues/${formatRepoUrl(props.repository.url)}/good%20first%20issue.svg?style=flat-square&label=good%20first%20issues&labelColor=e9ecef&color=6c757d`}
                  />
                </ExternalLink>
              </div>
            </div>
          </Show>
        </div>
      </div>
      <Show when={!isUndefined(props.repository.github_data)}>
        <div class="row g-4 my-0 mb-2 justify-content-center justify-md-content-start">
          <Box class={props.boxClass} value={prettifyNumber(props.repository.github_data!.stars, 1)} legend="Stars" />

          <Box
            class={props.boxClass}
            value={prettifyNumber(props.repository.github_data!.contributors.count)}
            legend="Contributors"
          />

          <Box
            class={props.boxClass}
            value={formatDate(props.repository.github_data!.first_commit.ts)}
            legend="First commit"
          />

          <Box
            class={props.boxClass}
            value={formatDate(props.repository.github_data!.latest_commit.ts)}
            legend="Latest commit"
          />

          <Box
            class={props.boxClass}
            value={
              !isUndefined(props.repository.github_data!.latest_release)
                ? formatDate(props.repository.github_data!.latest_release!.ts)
                : '-'
            }
            legend="Latest release"
          />
        </div>

        <Show when={!isUndefined(props.repository.github_data!.participation_stats)}>
          <div class="mt-4">
            <div class={`fw-semibold ${styles.subtitleInSection}`}>Participation stats</div>
            <div class="mx-2 mx-md-0">
              <ParticipationStats initialStats={props.repository.github_data!.participation_stats} />
            </div>
          </div>
        </Show>

        <Show
          when={
            !isUndefined(props.repository.github_data!.languages) && !isEmpty(props.repository.github_data!.languages)
          }
        >
          <div class="mt-4">
            <div class={`fw-semibold ${styles.subtitleInSection}`}>Languages</div>
            <LanguagesStats initialLanguages={props.repository.github_data!.languages!} boxClass={props.boxClass} />
          </div>
        </Show>
      </Show>
    </>
  );
};

const RepositoriesSection = (props: Props) => {
  const [selectedRepo, setSelectedRepo] = createSignal<Repository | undefined>(undefined);
  const [repositoriesList, setRepositoriesList] = createSignal<Repository[]>([]);

  onMount(() => {
    if (props.repositories && props.repositories.length > 0) {
      const sortedRepos = orderBy(
        props.repositories,
        [(r: Repository) => (r.primary === true ? 0 : 1), 'url'],
        ['asc']
      );
      setRepositoriesList(sortedRepos);
      setSelectedRepo(sortedRepos[0]);
    }
  });

  return (
    <Show when={repositoriesList().length > 0}>
      <div class={`position-relative ${props.class}`}>
        <div class={` ${props.titleClass}`}>Repositories</div>

        <select
          id="repo-select"
          class={`form-select form-select-md border-0 rounded-0 my-3 ${styles.select}`}
          value={selectedRepo() ? selectedRepo()!.url : undefined}
          aria-label="Repository select"
          onChange={(e) => {
            const repo = repositoriesList().find((r) => r.url === e.currentTarget.value);
            setSelectedRepo(repo);
          }}
        >
          <For each={repositoriesList()}>
            {(repo: Repository) => {
              return (
                <option value={repo.url}>
                  {formatRepoUrl(repo.url)}
                  <Show when={repo.primary}> (primary)</Show>
                </option>
              );
            }}
          </For>
        </select>

        <Show when={!isUndefined(selectedRepo())}>
          <RepositoryInfo repository={selectedRepo()!} boxClass={props.boxClass} />
        </Show>
      </div>
    </Show>
  );
};

export default RepositoriesSection;

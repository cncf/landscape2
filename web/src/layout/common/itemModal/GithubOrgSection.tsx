import isUndefined from 'lodash/isUndefined';
import isEmpty from 'lodash/isEmpty';
import { Show } from 'solid-js';
import ExternalLink from '../ExternalLink';
import styles from './AcademicSection.module.css';
import moment from 'moment';
import prettifyNumber from '../../../utils/prettifyNumber';
import LanguagesStats from './LanguagesStats';
import Box from './Box';
import ParticipationStats from './ParticipationStats';
import { Item } from '../../../types';

interface Props {
  item: Item;
  class: string;
}

const GithubOrgSection = (props: Props) => {
  const formatDate = (date: string): string => {
    return moment(date).format("MMM 'YY");
  };

  return (
    <Show when={!isUndefined(props.item.github_org_stats)}>
      <div class={`position-relative border ${styles.fieldset}`}>
        <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>GitHub</div>

        <div class="d-flex flex-row align-items-center my-2">
          <ExternalLink class="text-reset p-0 align-baseline fw-semibold" href={props.item.github_org_url!}>
            {props.item.github_org_url}
          </ExternalLink>
        </div>

        <div class="row g-4 my-0 mb-2">
          <Box value={prettifyNumber(props.item.github_org_stats!.stars, 1)} legend="Stars" />
          <Box value={prettifyNumber(props.item.github_org_stats!.num_contributors, 1)} legend="Contributors" />
          <Box value={prettifyNumber(props.item.github_org_stats!.num_repositories, 1)} legend="Repositories" />
          <Box value={formatDate(props.item.github_org_stats!.first_repo_created_at)} legend="First commit" />
          <Box value={formatDate(props.item.github_org_stats!.last_commit_at)} legend="Latest commit" />
        </div>

        <Show when={!isUndefined(props.item.github_org_stats!.participation)}>
          <div class="mt-4">
            <div class={`fw-semibold ${styles.subtitleInSection}`}>Participation stats</div>
            <ParticipationStats initialStats={props.item.github_org_stats!.participation} />
          </div>
        </Show>

        <Show when={!isUndefined(props.item.github_org_stats!.languages) && !isEmpty(props.item.github_org_stats!.languages)}>
          <div class="mt-4">
            <div class={`fw-semibold ${styles.subtitleInSection}`}>Languages</div>
            <LanguagesStats initialLanguages={props.item.github_org_stats!.languages!} />
          </div>
        </Show>

      </div>
    </Show>
  );
};

export default GithubOrgSection;

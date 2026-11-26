import { css } from 'solid-styled-components';

import { cx } from '../utils/cx';

interface Props {
  level: string;
  class?: string;
}

const Archived = css`
  background-color: var(--bs-orange);
`;

export const MaturityBadge = (props: Props) => (
  <div
    title={props.level}
    class={cx('badge rounded-0 text-uppercase', props.class)}
    classList={{
      [Archived]: props.level === 'archived',
      'bg-secondary': props.level !== 'archived',
    }}
  >
    {props.level}
  </div>
);

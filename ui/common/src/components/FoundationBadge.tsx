import { css } from 'solid-styled-components';

import { cx } from '../utils/cx';

interface Props {
  foundation: string;
  class?: string;
}

const Badge = css`
  background-color: var(--color1);
`;

export const FoundationBadge = (props: Props) => {
  return (
    <div title={props.foundation} class={cx('badge rounded-0', Badge, props.class)}>
      {props.foundation}
    </div>
  );
};

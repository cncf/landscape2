import { css } from 'solid-styled-components';

interface Props {
  foundation: string;
  class?: string;
}

const Badge = css`
  background-color: var(--color1);
`;

export const FoundationBadge = (props: Props) => {
  return (
    <div title={props.foundation} class={`badge rounded-0 ${Badge} ${props.class}`}>
      {props.foundation}
    </div>
  );
};

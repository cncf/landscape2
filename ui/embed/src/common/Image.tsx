import { createSignal, Show } from 'solid-js';
import { styled } from 'solid-styled-components';

import { Size } from '../types';

interface Props {
  name: string;
  logo: string;
  size?: Size;
  class?: string;
}

interface ItemProps {
  size?: Size;
}

type FontSize = {
  [key in Size]: string;
};

const FONT_SIZES: FontSize = {
  [Size.XSmall]: '2rem',
  [Size.Small]: '3rem',
  [Size.Medium]: '4rem',
  [Size.Large]: '5rem',
  [Size.XLarge]: '8rem',
};

const PlaceholderImage = styled('div')`
  display: flex;
  opacity: 0.25;
  font-size: ${(props: ItemProps) => FONT_SIZES[props.size || Size.Medium]};
`;

const Image = (props: Props) => {
  const [error, setError] = createSignal(false);

  return (
    <Show
      when={!error()}
      fallback={
        <PlaceholderImage size={props.size}>
          <svg
            stroke="currentColor"
            fill="currentColor"
            stroke-width="0"
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M21.9 21.9l-6.1-6.1-2.69-2.69L5 5 3.59 3.59 2.1 2.1.69 3.51 3 5.83V19c0 1.1.9 2 2 2h13.17l2.31 2.31 1.42-1.41zM5 19V7.83l6.84 6.84-.84 1.05L9 13l-3 4h8.17l2 2H5zM7.83 5l-2-2H19c1.1 0 2 .9 2 2v13.17l-2-2V5H7.83z" />
          </svg>
        </PlaceholderImage>
      }
    >
      <img
        alt={`${props.name} logo`}
        class={props.class}
        src={import.meta.env.MODE === 'development' ? `http://localhost:8000/${props.logo}` : `../${props.logo}`}
        onError={() => setError(true)}
      />
    </Show>
  );
};

export default Image;

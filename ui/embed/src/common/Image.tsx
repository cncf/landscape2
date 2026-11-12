// Local copy of the common `Image` component: the common one depends on
// Bootstrap, which the third-party embed deliberately does not load. It keeps
// the same behavior: absolute logo urls used as they are, lazy loading and a
// decorative fallback icon when the logo cannot be loaded.
import { Size } from 'common/embed';
import { REGEX_URL } from 'common/utils';
import { createMemo, createSignal, Show } from 'solid-js';
import { styled } from 'solid-styled-components';

import { getDataOrigin } from '../utils/dataOrigin';

interface Props {
  logo: string;
  name: string;
  class?: string;
  size?: Size;
}

interface PlaceholderProps {
  size?: Size;
}

const FONT_SIZES: Record<Size, string> = {
  [Size.XSmall]: '2rem',
  [Size.Small]: '3rem',
  [Size.Medium]: '4rem',
  [Size.Large]: '5rem',
  [Size.XLarge]: '8rem',
};

const PlaceholderImage = styled('div')`
  display: flex;
  opacity: 0.25;
  font-size: ${(props: PlaceholderProps) => FONT_SIZES[props.size || Size.Medium]};
`;

const Image = (props: Props) => {
  const [error, setError] = createSignal(false);
  const url = createMemo(() => (REGEX_URL.test(props.logo) ? props.logo : `${getDataOrigin()}/${props.logo}`));

  return (
    <Show
      when={!error()}
      fallback={
        <PlaceholderImage size={props.size}>
          <svg
            aria-hidden="true"
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
      <img alt={`${props.name} logo`} class={props.class} loading="lazy" src={url()} onError={() => setError(true)} />
    </Show>
  );
};

export default Image;

import isUndefined from 'lodash/isUndefined';
import { createSignal, onMount, Show } from 'solid-js';

import { REGEX_URL } from '../data/data';
import { SVGIconKind } from '../types/types';
import { SVGIcon } from './SVGIcon';

interface Props {
  name: string;
  logo: string;
  class?: string;
  enableLazyLoad?: boolean;
  width?: string | number;
  height?: string | number;
}

export const Image = (props: Props) => {
  const [error, setError] = createSignal(false);
  const [url, setUrl] = createSignal<string>();

  onMount(() => {
    if (REGEX_URL.test(props.logo)) {
      setUrl(props.logo);
    } else {
      setUrl(import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `./${props.logo}`);
    }
  });

  return (
    <Show when={!isUndefined(url())}>
      {error() ? (
        <SVGIcon kind={SVGIconKind.NotImage} class={`opacity-25 ${props.class}`} />
      ) : (
        <img
          alt={`${props.name} logo`}
          class={props.class}
          src={url()}
          onError={() => setError(true)}
          loading={!isUndefined(props.enableLazyLoad) && props.enableLazyLoad ? 'lazy' : undefined}
          width={props.width || 'auto'}
          height={props.height || 'auto'}
        />
      )}
    </Show>
  );
};

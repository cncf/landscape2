import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, on } from 'solid-js';

import { REGEX_URL } from '../data/data';
import { SVGIconKind } from '../types/types';
import { cx } from '../utils/cx';
import { SVGIcon } from './SVGIcon';

interface Props {
  logo: string;
  /** Alternative text; defaults to the name followed by "logo". */
  alt?: string;
  ariaHidden?: boolean;
  class?: string;
  enableLazyLoad?: boolean;
  height?: string | number;
  name?: string;
  width?: string | number;
}

/** Logo image resolved from an absolute URL or a static path; shows the NotImage icon on error and retries when `logo` changes. */
export const Image = (props: Props) => {
  const [error, setError] = createSignal(false);
  const alt = () => props.alt ?? (!isUndefined(props.name) ? `${props.name} logo` : '');
  const url = createMemo(() => {
    if (REGEX_URL.test(props.logo)) return props.logo;
    return import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `./${props.logo}`;
  });

  // A new logo gets a fresh attempt after a failed one
  createEffect(
    on(
      () => props.logo,
      () => setError(false),
      { defer: true }
    )
  );

  return (
    <>
      {error() ? (
        <SVGIcon kind={SVGIconKind.NotImage} class={cx('opacity-25', props.class)} />
      ) : (
        <img
          alt={alt()}
          class={props.class}
          src={url()}
          onError={() => setError(true)}
          loading={props.enableLazyLoad ? 'lazy' : undefined}
          width={props.width}
          height={props.height}
          aria-hidden={props.ariaHidden || undefined}
        />
      )}
    </>
  );
};

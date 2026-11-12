import { JSXElement, Show } from 'solid-js';

import { cx } from '../../utils/cx';
import { Fieldset, FieldsetTitle, SectionTitle, type SectionVariant } from './styles';

interface Props {
  children: JSXElement;
  title: string;
  variant: SectionVariant;
  class?: string;
}

/**
 * Item modal section: a bordered fieldset with a floating title on desktop, or a heading followed by
 * the content on mobile.
 */
export const Section = (props: Props) => (
  <Show
    when={props.variant === 'mobile'}
    fallback={
      <section class={cx('position-relative border', Fieldset, props.class)}>
        <h3 class={`position-absolute px-2 mb-0 bg-white fw-semibold ${FieldsetTitle}`}>{props.title}</h3>
        {props.children}
      </section>
    }
  >
    <section class={props.class}>
      <h3 class={`text-uppercase mt-3 fw-semibold border-bottom lh-base ${SectionTitle}`}>{props.title}</h3>
      {props.children}
    </section>
  </Show>
);

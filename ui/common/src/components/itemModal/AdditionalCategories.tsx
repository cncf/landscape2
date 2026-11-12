import { For, Show } from 'solid-js';

import type { Item } from '../../types/datasets';
import { cx } from '../../utils/cx';
import { BadgeOutlineDark, type SectionVariant, TitleInSection } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

/** Additional categories and subcategories the item is listed in. */
export const AdditionalCategories = (props: Props) => {
  const isMobile = () => props.variant === 'mobile';

  return (
    <Show when={props.item.additional_categories?.length}>
      <div class={`fw-bold text-uppercase ${isMobile() ? 'my-3' : 'mt-4 mb-3'} ${TitleInSection[props.variant]}`}>
        Additional categories
      </div>
      <div
        class={
          isMobile()
            ? 'd-flex flex-column flex-sm-row align-items-start mb-1'
            : 'd-flex flex-row flex-wrap align-items-center mb-2'
        }
      >
        <For each={props.item.additional_categories}>
          {(additional) => (
            <div class={cx('badge rounded-0 mb-2 me-2', isMobile() && 'text-truncate mw-100', BadgeOutlineDark)}>
              {additional.category} / {additional.subcategory}
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

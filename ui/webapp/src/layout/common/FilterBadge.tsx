import { SVGIcon, SVGIconKind } from 'common';
import { JSXElement, Show } from 'solid-js';

import { FilterCategory } from '../../types';
import styles from './FilterBadge.module.css';

interface Props {
  category?: FilterCategory;
  label: JSXElement;
  removeLabel: string;
  onRemove: () => void;
}

/**
 * Badge of an applied filter, as a list item: the category (when given), the label
 * and a button, named after `removeLabel`, that removes the filter.
 */
const FilterBadge = (props: Props) => (
  <span
    role="listitem"
    class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.badge}`}
  >
    <div class="d-flex flex-row align-items-baseline">
      <div>
        <Show when={props.category}>
          <small class="text-uppercase fw-normal me-2">{props.category}:</small>
        </Show>
        {props.label}
      </div>
      <button
        type="button"
        class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
        onClick={() => props.onRemove()}
        aria-label={props.removeLabel}
        title={props.removeLabel}
      >
        <SVGIcon kind={SVGIconKind.ClearCircle} />
      </button>
    </div>
  </span>
);

export default FilterBadge;

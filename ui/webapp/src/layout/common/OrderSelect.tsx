import { For } from 'solid-js';

import { TableSort, TableSortOption } from '../../utils/tableQuery';
import styles from './DataTable.module.css';

interface Props {
  options: readonly TableSortOption[];
  value: TableSort;
  onChange: (sort: TableSort) => void;
}

/** Order select of a table page, listing its sort options. */
const OrderSelect = (props: Props) => (
  <select
    class={`form-select form-select-sm rounded-0 ${styles.select}`}
    value={getSortKey(props.value)}
    aria-label="Order options"
    onChange={(e) => {
      const option = props.options.find((opt) => getSortKey(opt) === e.currentTarget.value);
      if (option) {
        props.onChange(option);
      }
    }}
  >
    <For each={props.options}>{(opt) => <option value={getSortKey(opt)}>{opt.label}</option>}</For>
  </select>
);

export default OrderSelect;

/** Returns the option value of a sort. */
const getSortKey = (sort: TableSort): string => `${sort.by}-${sort.direction}`;

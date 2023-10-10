import { JSXElement } from 'solid-js';

import styles from './Checkbox.module.css';

export interface Props {
  name: string;
  value: string;
  label: string | JSXElement;
  legend?: string;
  checked: boolean;
  disabled?: boolean;
  class?: string;
  labelClass?: string;
  icon?: JSXElement;
  onChange?: (value: string, checked: boolean) => void;
}

export const CheckBox = (props: Props) => (
  <div class={`form-check me-sm-2 mb-0 ${props.class}`}>
    <input
      type="checkbox"
      class={`form-check-input rounded-0 ${styles.checkbox}`}
      name={props.name}
      value={props.value}
      id={`${props.name}-${props.value}`}
      onInput={(e) => {
        if (props.onChange) {
          props.onChange(e.currentTarget.value, e.currentTarget.checked);
        }
      }}
      checked={props.checked}
      aria-checked={props.checked}
      disabled={props.disabled}
      tabIndex={0}
    />
    <label
      class={`form-check-label ${styles.label} ${props.labelClass}`}
      for={`${props.name}-${props.value}`}
      data-testid="checkboxLabel"
    >
      <div class="d-flex align-items-baseline mw-100">
        {props.icon && <>{props.icon}</>}
        <span class="text-truncate">{props.label}</span>
        {props.legend && <small class="ps-1">{props.legend}</small>}
      </div>
    </label>
  </div>
);

import isUndefined from 'lodash/isUndefined';
import { JSXElement } from 'solid-js';

import styles from './Checkbox.module.css';

interface Props {
  name: string;
  value: string;
  label: string | JSXElement;
  legend?: string;
  checked: boolean;
  disabled?: boolean;
  class?: string;
  labelClass?: string;
  device?: string;
  icon?: JSXElement;
  type?: 'checkbox' | 'radio';
  onChange?: (value: string, checked: boolean) => void;
}

const CheckBox = (props: Props) => {
  const inputId = () => `${!isUndefined(props.device) ? `${props.device}-` : ''}${props.name}-${props.value}`;

  return (
    <div class={`form-check me-sm-2 mb-0 ${props.class}`}>
      <input
        type={props.type || 'checkbox'}
        class={`form-check-input rounded-0 ${styles.checkbox}`}
        classList={{
          'rounded-0': isUndefined(props.type) || props.type !== 'radio',
        }}
        name={props.name}
        value={props.value}
        id={inputId()}
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
      <label class={`form-check-label ${styles.label} ${props.labelClass}`} for={inputId()}>
        <div class="d-flex align-items-baseline mw-100">
          {props.icon && <>{props.icon}</>}
          <span class="text-truncate">{props.label}</span>
          {props.legend && <small class="ps-1">{props.legend}</small>}
        </div>
      </label>
    </div>
  );
};

export default CheckBox;

import { ChangeEvent } from 'react';
import styles from './Checkbox.module.css';

export interface Props {
  name: string;
  value: string;
  label: string | JSX.Element;
  legend?: string;
  checked: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  icon?: JSX.Element;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const CheckBox = (props: Props) => {
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const id = `${props.name}-${props.value}`;

  return (
    <div className={`form-check me-sm-2 mb-0 ${props.className}`}>
      <input
        type="checkbox"
        className={`form-check-input rounded-0 ${styles.checkbox}`}
        name={props.name}
        value={props.value}
        id={id}
        onChange={handleOnChange}
        checked={props.checked}
        aria-checked={props.checked}
        disabled={props.disabled}
        tabIndex={0}
      />
      <label className={`form-check-label ${props.labelClassName}`} htmlFor={id} data-testid="checkboxLabel">
        <div className="d-flex align-items-baseline mw-100">
          {props.icon && <>{props.icon}</>}
          <span className="text-truncate">{props.label}</span>
          {props.legend && <small className="ps-1">{props.legend}</small>}
        </div>
      </label>
    </div>
  );
};

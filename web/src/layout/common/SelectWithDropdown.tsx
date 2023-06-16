import { ChangeEvent } from 'react';
import { FilterOption } from '../../types';
import { CheckBox } from './Checkbox';

interface Props {
  options: FilterOption[];
  activeFilters?: string[];
  onChange: (name: string, value: string, checked: boolean) => void;
}

const SelectWithDropdown = (props: Props) => {
  const renderCheckBox = (opt: FilterOption) => (
    <CheckBox
      key={`filter_${opt.value}`}
      name={opt.name}
      value={opt.value}
      labelClassName="mw-100"
      label={opt.name}
      checked={(props.activeFilters || []).includes(opt.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.target.name, e.target.value, e.target.checked)}
    />
  );

  return (
    <>
      {props.options.map((opt: FilterOption) => {
        return (
          <>
            {renderCheckBox(opt)}
            {opt.suboptions && <>{opt.suboptions.map((subOpt) => renderCheckBox(subOpt))}</>}
          </>
        );
      })}
    </>
  );
};

export default SelectWithDropdown;

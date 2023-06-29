import { ChangeEvent, Fragment } from 'react';
import { FilterCategory, FilterOption, FilterSection } from '../../../types';
import { CheckBox } from '../../common/Checkbox';
import styles from './Section.module.css';

interface Props {
  section: FilterSection;
  activeFilters?: string[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
}

const Section = (props: Props) => {
  const onChange = (name: FilterCategory, value: string, checked: boolean, subOtps?: string[]) => {
    let tmpActiveFilters: string[] = props.activeFilters ? [...props.activeFilters] : [];
    if (!checked) {
      if (props.activeFilters) {
        tmpActiveFilters = props.activeFilters.filter((f: string) => f !== value && !(subOtps || []).includes(f));
      }
    } else {
      if (subOtps === undefined) {
        tmpActiveFilters.push(value);
      } else {
        tmpActiveFilters = [...tmpActiveFilters, ...subOtps];
        tmpActiveFilters.push(value);
        tmpActiveFilters = [...new Set(tmpActiveFilters)];
      }
    }
    props.updateActiveFilters(name, tmpActiveFilters);
  };

  const renderCheckBox = (opt: FilterOption, sectionName: FilterCategory, subOtps?: string[]) => (
    <CheckBox
      key={`filter_${opt.value}`}
      name={sectionName as unknown as string}
      value={opt.value}
      labelClassName="mw-100"
      label={opt.name}
      checked={(props.activeFilters || []).includes(opt.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.name as unknown as FilterCategory, e.target.value, e.target.checked, subOtps)
      }
    />
  );

  return (
    <div>
      <small className={`fw-bold text-uppercase text-dark pb-2 ${styles.categoryTitle}`}>{props.section.title}</small>
      {props.section.options.map((opt: FilterOption) => {
        let subOpts;
        if (opt.suboptions) {
          subOpts = opt.suboptions.map((subOpt: FilterOption) => subOpt.value);
        }
        return (
          <div key={`f_${props.section.value}_opt_${opt.value}`} className={`mt-2 ${styles.checks}`}>
            {renderCheckBox(opt, props.section.value, subOpts)}
            <div className="ms-3 mt-2">
              {opt.suboptions && (
                <>
                  {opt.suboptions.map((subOpt: FilterOption) => (
                    <Fragment key={`f_${props.section.value}_subopt_${subOpt.value}`}>
                      {renderCheckBox(subOpt, props.section.value)}
                    </Fragment>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Section;

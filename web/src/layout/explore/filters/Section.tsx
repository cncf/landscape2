import { ChangeEvent, Fragment } from 'react';
import { FilterCategory, FilterOption, FilterSection } from '../../../types';
import { CheckBox } from '../../common/Checkbox';
import styles from './Section.module.css';
import classNames from 'classnames';

interface Props {
  section?: FilterSection;
  activeFilters?: string[];
  withTitle?: boolean;
  inLine?: boolean;
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
      className={classNames('mt-2', { 'mb-2': props.inLine === undefined })}
      label={opt.name}
      checked={(props.activeFilters || []).includes(opt.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.name as unknown as FilterCategory, e.target.value, e.target.checked, subOtps)
      }
    />
  );

  if (props.section === undefined) return null;

  return (
    <div>
      <div className={classNames({ 'd-flex flex-row': props.inLine })}>
        {props.section.options.map((opt: FilterOption) => {
          let subOpts;
          if (opt.suboptions) {
            subOpts = opt.suboptions.map((subOpt: FilterOption) => subOpt.value);
          }
          return (
            <div
              key={`f_${props.section?.value}_opt_${opt.value}`}
              className={classNames(styles.checks, { 'me-3': props.inLine })}
            >
              {renderCheckBox(opt, props.section?.value as FilterCategory, subOpts)}
              <div className="ms-3">
                {opt.suboptions && (
                  <>
                    {opt.suboptions.map((subOpt: FilterOption) => (
                      <Fragment key={`f_${props.section?.value}_subopt_${subOpt.value}`}>
                        {renderCheckBox(subOpt, props.section?.value as FilterCategory)}
                      </Fragment>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {props.withTitle && <small className={`text-muted ${styles.legend}`}>{props.section.title}</small>}
    </div>
  );
};

export default Section;

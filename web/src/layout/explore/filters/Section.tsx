import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, Fragment, memo, useCallback } from 'react';

import { FilterCategory, FilterOption, FilterSection } from '../../../types';
import { CheckBox } from '../../common/Checkbox';
import styles from './Section.module.css';

interface Props {
  section?: FilterSection;
  activeFilters?: string[];
  title?: string;
  inLine?: boolean;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilter: (value: FilterCategory) => void;
}

const Section = memo(function Section(props: Props) {
  const onChange = useCallback(
    (name: FilterCategory, value: string, checked: boolean, subOtps?: string[]) => {
      let tmpActiveFilters: string[] = props.activeFilters ? [...props.activeFilters] : [];
      if (!checked) {
        if (props.activeFilters) {
          tmpActiveFilters = props.activeFilters.filter((f: string) => f !== value && !(subOtps || []).includes(f));
        }
      } else {
        if (isUndefined(subOtps)) {
          tmpActiveFilters.push(value);
        } else {
          tmpActiveFilters = [...tmpActiveFilters, ...subOtps];
          tmpActiveFilters.push(value);
          tmpActiveFilters = [...new Set(tmpActiveFilters)];
        }
      }
      props.updateActiveFilters(name, tmpActiveFilters);
    },
    [props]
  );

  const renderCheckBox = (opt: FilterOption, sectionName: FilterCategory, subOtps?: string[]) => (
    <CheckBox
      key={`filter_${opt.value}`}
      name={sectionName as unknown as string}
      value={opt.value}
      labelClassName="mw-100 text-muted"
      className={classNames('mt-2', { 'mb-2': isUndefined(props.inLine) })}
      label={opt.name}
      checked={(props.activeFilters || []).includes(opt.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.name as unknown as FilterCategory, e.target.value, e.target.checked, subOtps)
      }
    />
  );

  if (isUndefined(props.section)) return null;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex flex-row align-items-center pb-3">
        <small className={`fw-semibold me-2 ${styles.title}`}>{props.title || props.section.title}</small>
        {props.activeFilters && (
          <button
            className={`btn btn-sm btn-link text-muted lh-1 align-baseline p-0 ${styles.resetBtn}`}
            onClick={() => props.resetFilter(props.section?.value as FilterCategory)}
          >
            (reset)
          </button>
        )}
      </div>
      <div className="postion-relative w-100 border p-3 flex-grow-1">
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
      </div>
    </div>
  );
});

export default Section;

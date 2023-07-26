import { ActiveFilters, FilterCategory, SVGIconKind } from '../../../types';
import formatProfitLabel from '../../../utils/formatLabelProfit';
import SVGIcon from '../../common/SVGIcon';
import styles from './ActiveFiltersList.module.css';

interface Props {
  activeFilters: ActiveFilters;
  resetFilters: () => void;
  removeFilter: (name: FilterCategory, value: string) => void;
}

const ActiveFiltersList = (props: Props) => (
  <>
    {Object.keys(props.activeFilters).length > 0 && (
      <div className="d-flex flex-row align-items-baseline mb-3">
        <div className={`d-flex flex-row align-items-center text-muted text-uppercase me-3 ${styles.btnLegend}`}>
          <small>Filters applied</small>
          <button className={`btn btn-link btn-sm text-muted p-0 ps-1 ${styles.btnReset}`} onClick={props.resetFilters}>
            (reset all)
          </button>
          <small>:</small>
        </div>
        {Object.keys(props.activeFilters).map((f: string) => {
          if (props.activeFilters[f as FilterCategory] === undefined) return null;
          return (
            <div className="d-flex flex-row" key={`active_${f}`} role="list">
              {props.activeFilters[f as FilterCategory]?.map((c: string) => {
                if (f === FilterCategory.Project && c === 'cncf') return null;
                return (
                  <span
                    role="listitem"
                    key={`active_${f}_${c}`}
                    className={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
                  >
                    <div className="d-flex flex-row align-items-baseline">
                      <div>
                        <small className="text-uppercase fw-normal me-2">{f}:</small>
                        <span
                          className={
                            [FilterCategory.Project, FilterCategory.CompanyType].includes(f as FilterCategory)
                              ? 'text-uppercase'
                              : ''
                          }
                        >
                          {f === FilterCategory.CompanyType ? formatProfitLabel(c) : c}
                        </span>
                      </div>
                      <button
                        className="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                        onClick={() => props.removeFilter(f as FilterCategory, c)}
                        aria-label={`Remove ${c} filter`}
                        title={`Remove ${c} filter`}
                      >
                        <SVGIcon kind={SVGIconKind.ClearCircle} />
                      </button>
                    </div>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    )}
  </>
);

export default ActiveFiltersList;

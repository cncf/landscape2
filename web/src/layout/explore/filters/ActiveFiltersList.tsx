import { ActiveFilters, FilterCategory } from '../../../types';
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
                          {c}
                        </span>
                      </div>
                      <button
                        className="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                        onClick={() => props.removeFilter(f as FilterCategory, c)}
                        aria-label={`Remove ${c} filter`}
                        title={`Remove ${c} filter`}
                      >
                        <svg
                          stroke="currentColor"
                          fill="currentColor"
                          strokeWidth="0"
                          viewBox="0 0 512 512"
                          height="1em"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M256 90c44.3 0 86 17.3 117.4 48.6C404.7 170 422 211.7 422 256s-17.3 86-48.6 117.4C342 404.7 300.3 422 256 422s-86-17.3-117.4-48.6C107.3 342 90 300.3 90 256s17.3-86 48.6-117.4C170 107.3 211.7 90 256 90m0-42C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48z"></path>
                          <path d="M360 330.9L330.9 360 256 285.1 181.1 360 152 330.9l74.9-74.9-74.9-74.9 29.1-29.1 74.9 74.9 74.9-74.9 29.1 29.1-74.9 74.9z"></path>
                        </svg>
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

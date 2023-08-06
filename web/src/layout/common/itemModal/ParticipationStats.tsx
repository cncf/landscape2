import { isInteger } from 'lodash';
import moment from 'moment';
import { useEffect, useState } from 'react';

import calculateAxisValues from '../../../utils/calculateAxisValues';
import styles from './ParticipationStats.module.css';

interface Props {
  stats: number[];
}

const ParticipationStats = (props: Props) => {
  const maxValue = Math.max(...props.stats);
  const axisValues = calculateAxisValues(0, maxValue, 4);
  const isAllZero = props.stats.every((item) => item === 0);
  const [months, setMonths] = useState<string[] | undefined>(undefined);

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / maxValue;
  };

  useEffect(() => {
    setMonths(
      [...Array(4).keys()].map((n: number) => {
        return moment()
          .subtract(n * 3, 'months')
          .format("MMM 'YY");
      })
    );
  }, []);

  return (
    <div className="d-flex flex-row mt-3">
      <div className="flex-grow-1">
        <div className={`mb-2 border-bottom border-end pt-2 ${styles.chart}`}>
          <div className="d-flex flex-row justify-content-between align-items-end h-100 w-100">
            {isAllZero ? (
              <div
                className={`alert alert-primary text-muted mx-auto mb-4 px-5 py-2 text-center border ${styles.message}`}
              >
                No activity in the last year
              </div>
            ) : (
              <>
                {props.stats.map((x: number, index: number) => {
                  return (
                    <div
                      key={`bar_${index}`}
                      title={x.toString()}
                      className={`mx-1 ${styles.bar}`}
                      style={{ height: `${percentage(x)}%` }}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
        {months && (
          <div className="d-flex flex-row-reverse justify-content-between mb-1">
            {months.map((m: string) => {
              return (
                <div key={`m_${m}`} className={`text-muted text-nowrap ${styles.month}`}>
                  {m}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!isAllZero && (
        <div className={`d-flex flex-row align-items-center ${styles.chart}`}>
          <div className="d-flex flex-column-reverse justify-content-between h-100">
            {axisValues.map((value: number, index: number) => {
              return (
                <div key={`part_${index}_${value}`} className={`text-end ps-1 ${styles.axisValue}`}>
                  {isInteger(value) ? value : value.toFixed(1)}
                </div>
              );
            })}
          </div>
          <div className={`fst-italic text-muted text-center ms-1 ${styles.axisLegend}`}>Commits</div>
        </div>
      )}
    </div>
  );
};

export default ParticipationStats;

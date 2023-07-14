import { useEffect, useState } from 'react';
import styles from './ParticipationStats.module.css';
import moment from 'moment';

interface Props {
  stats: number[];
}

const ParticipationStats = (props: Props) => {
  const maxValue = Math.max(...props.stats);
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
    <>
      <div className={`mt-3 mb-2 border-bottom pt-2 ${styles.chart}`}>
        <div className="d-flex flex-row justify-content-between align-items-end h-100 w-100">
          {isAllZero ? (
            <div
              className={`alert alert-primary text-muted mx-auto mb-3 px-5 py-2 text-center border ${styles.message}`}
            >
              No activity in the last year
            </div>
          ) : (
            <>
              {props.stats.map((x: number, index: number) => {
                return (
                  <div key={`bar_${index}`} className={`mx-1 ${styles.bar}`} style={{ height: `${percentage(x)}%` }} />
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
    </>
  );
};

export default ParticipationStats;

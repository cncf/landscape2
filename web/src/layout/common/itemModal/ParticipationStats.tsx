import NoData from '../NoData';
import styles from './ParticipationStats.module.css';

interface Props {
  stats: number[];
}

const ParticipationStats = (props: Props) => {
  const maxValue = Math.max(...props.stats);
  const isAllZero = props.stats.every((item) => item === 0);

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / maxValue;
  };

  return (
    <div className={`mt-3 mb-2 border-bottom pt-2 ${styles.chart}`}>
      <div className="d-flex flex-row justify-content-between align-items-end h-100 w-100">
        {isAllZero ? (
          <div className={`alert alert-primary text-muted m-auto px-5 py-2 text-center border ${styles.message}`}>
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
  );
};

export default ParticipationStats;

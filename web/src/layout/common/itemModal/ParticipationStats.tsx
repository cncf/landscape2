import styles from './ParticipationStats.module.css';

interface Props {
  stats: number[];
}

const ParticipationStats = (props: Props) => {
  const maxValue = Math.max(...props.stats);

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / maxValue;
  };

  return (
    <div className={`mt-3 border-bottom pt-2 ${styles.chart}`}>
      <div className="d-flex flex-row justify-content-between align-items-end h-100 w-100">
        {props.stats.map((x: number, index: number) => {
          return <div key={`bar_${index}`} className={`mx-1 ${styles.bar}`} style={{ height: `${percentage(x)}%` }} />;
        })}
      </div>
    </div>
  );
};

export default ParticipationStats;

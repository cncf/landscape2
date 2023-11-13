import styles from './MaturityBadge.module.css';

interface Props {
  level: string;
  class?: string;
}

const MaturityBadge = (props: Props) => (
  <div
    title={props.level}
    class={`badge rounded-0 text-uppercase ${styles.badge} ${props.class}`}
    classList={{
      [styles.archived]: props.level === 'archived',
      'bg-secondary': props.level !== 'archived',
    }}
  >
    {props.level}
  </div>
);

export default MaturityBadge;

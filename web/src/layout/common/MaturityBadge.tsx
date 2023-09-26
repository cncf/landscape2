import styles from './MaturityBadge.module.css';

interface Props {
  level: string;
  class?: string;
}

const MaturityBadge = (props: Props) => (
  <div
    title={props.level}
    class={`badge rounded-0 text-uppercase bg-secondary ${styles.badge} ${props.class}`}
    classList={{
      archived: props.level === 'archived',
    }}
  >
    {props.level}
  </div>
);

export default MaturityBadge;

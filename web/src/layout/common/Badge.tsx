import styles from './Badge.module.css';

interface Props {
  text: string;
  class?: string;
}

const Badge = (props: Props) => (
  <div class={`badge rounded-0 text-uppercase ${styles.badge} ${props.class}`}>{props.text}</div>
);

export default Badge;

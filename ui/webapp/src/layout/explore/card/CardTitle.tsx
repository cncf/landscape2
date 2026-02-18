import styles from './CardTitle.module.css';

interface Props {
  title: string;
  isVisible?: boolean;
}

const CardTitle = (props: Props) => {
  return <div class={`fw-semibold text-truncate pb-1 ${styles.title}`}>{props.title}</div>;
};

export default CardTitle;

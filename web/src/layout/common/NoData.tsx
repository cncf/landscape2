import styles from './NoData.module.css';

interface Props {
  children: string | JSX.Element;
  className?: string;
}

const NoData = (props: Props) => (
  <div
    role="alert"
    className={`alert alert-primary mx-auto my-5 text-center p-4 p-sm-5 border border-1 ${styles.wrapper} ${props.className}`}
  >
    <div>{props.children}</div>
  </div>
);

export default NoData;

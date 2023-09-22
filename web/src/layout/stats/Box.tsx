import isUndefined from 'lodash/isUndefined';

import styles from './Box.module.css';

interface Props {
  label: string;
  data?: number | string;
  legend?: string;
}

const Box = (props: Props) => {
  if (isUndefined(props.data)) return null;

  return (
    <div className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.box}`}>
      <div className={`fw-bold text-nowrap mb-0 mt-1 ${styles.data}`}>{props.data}</div>
      <div className={`mb-3 pt-1 ${styles.legend}`}>{props.legend}</div>
      <div className={`fw-semibold text-uppercase text-truncate ${styles.label}`}>
        <small>{props.label}</small>
      </div>
    </div>
  );
};

export default Box;

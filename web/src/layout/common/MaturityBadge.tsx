import classNames from 'classnames';

import styles from './MaturityBadge.module.css';

interface Props {
  level: string;
  className?: string;
}

const MaturityBadge = (props: Props) => (
  <div
    title={props.level}
    className={classNames(
      'badge rounded-0 text-uppercase',
      { [styles.archived]: props.level === 'archived' },
      { 'bg-secondary': props.level !== 'archived' },
      props.className
    )}
  >
    {props.level}
  </div>
);

export default MaturityBadge;

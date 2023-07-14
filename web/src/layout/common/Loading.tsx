import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';

import styles from './Loading.module.css';

export interface ILoadingProps {
  className?: string;
  spinnerClassName?: string;
  smallSize?: boolean;
  position?: 'fixed' | 'absolute' | 'relative';
  transparentBg?: boolean;
  noWrapper?: boolean;
}

export const Loading: React.FC<ILoadingProps> = (props: ILoadingProps) => {
  const getSpinner = (): JSX.Element => {
    return (
      <div
        className={classnames(styles.wave, { [styles.miniWave]: props.smallSize }, props.spinnerClassName)}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    );
  };

  return (
    <>
      {isUndefined(props.noWrapper) || !props.noWrapper ? (
        <div
          className={classnames(
            'position-absolute top-0 bottom-0 start-0 end-0',
            { 'p-5': isUndefined(props.smallSize) || !props.smallSize },
            `position-${props.position || 'absolute'}`,
            styles.wrapper,
            { [styles.transparentBg]: !isUndefined(props.transparentBg) && props.transparentBg },
            props.className
          )}
        >
          <div className="d-flex flex-row align-items-center justify-content-center w-100 h-100">{getSpinner()}</div>
        </div>
      ) : (
        <>{getSpinner()}</>
      )}
    </>
  );
};

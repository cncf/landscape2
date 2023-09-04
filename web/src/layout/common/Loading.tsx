import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
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
      <div className="d-flex justify-content-center">
        <div
          className={classNames('spinner-border text-secondary', styles.spinner, {
            [styles.miniSpinner]: !isUndefined(props.smallSize) && props.smallSize,
          })}
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {isUndefined(props.noWrapper) || !props.noWrapper ? (
        <div
          className={classNames(
            'top-0 bottom-0 start-0 end-0 position-absolute',
            { 'p-5': isUndefined(props.smallSize) || !props.smallSize },
            `position-${props.position || 'absolute'}`,
            styles.wrapper,
            { [styles.transparentBg]: !isUndefined(props.transparentBg) && props.transparentBg },
            props.className
          )}
        >
          <div
            className={
              props.spinnerClassName || 'd-flex flex-row align-items-center justify-content-center w-100 h-100'
            }
          >
            {getSpinner()}
          </div>
        </div>
      ) : (
        <>{getSpinner()}</>
      )}
    </>
  );
};

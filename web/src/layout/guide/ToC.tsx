import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { Fragment } from 'react';

import { ToCTitle } from '../../types';
import styles from './ToC.module.css';

interface Props {
  toc: ToCTitle[];
  activeTitle?: string;
  updateActiveTitle: (activeTitle: string) => void;
}

interface OptionProps {
  option: ToCTitle;
  level: number;
  updateActiveTitle: (activeTitle: string) => void;
}

const ToCOption = (props: OptionProps) => {
  return (
    <>
      <button
        id={`btn_${props.option.id}`}
        className={classNames(
          'btn btn-link py-1 px-3 text-start w-100 rounded-0 position-relative text-truncate',
          styles.btn,
          styles[`level-${props.level}`],
          { ['fw-semibold text-muted']: props.level === 0 },
          { [styles.active]: location.hash === `#${props.option.id}` }
        )}
        onClick={() => {
          props.updateActiveTitle(props.option.id);
        }}
      >
        {props.option.title}
      </button>
      {!isUndefined(props.option.options) && (
        <div className="mb-3">
          {props.option.options.map((el: ToCTitle) => {
            return (
              <Fragment key={`t_${el.id}`}>
                <ToCOption option={el} level={props.level + 1} updateActiveTitle={props.updateActiveTitle} />
              </Fragment>
            );
          })}
        </div>
      )}
    </>
  );
};

const ToC = (props: Props) => {
  return (
    <div className={`sticky-top ${styles.toc}`}>
      <div className={`border border-1 m-4 ms-0 rounded-0 offcanvas-body overflow-hidden ${styles.wrapper}`}>
        <div className={`fs-6 text-uppercase fw-bold border-bottom px-4 py-3 ${styles.title}`}>Index</div>
        <div id="menu" className={`overflow-auto py-3 ${styles.content}`}>
          {props.toc.map((el: ToCTitle) => {
            return (
              <Fragment key={`t_${el.id}`}>
                <ToCOption option={el} level={0} updateActiveTitle={props.updateActiveTitle} />
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToC;

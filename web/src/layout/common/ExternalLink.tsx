import './ExternalLink.module.css';

import isUndefined from 'lodash/isUndefined';
import { JSXElement } from 'solid-js';

import { SVGIconKind } from '../../types';
import styles from './ExternalLink.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  children: JSXElement | JSXElement[] | string;
  href: string;
  class?: string;
  btnType?: boolean;
  target?: string;
  label?: string;
  title?: string;
  ariaHidden?: boolean;
  externalIconClassName?: string;
  visibleExternalIcon?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const ExternalLink = (props: Props) => {
  const getData = () => {
    return (
      <>
        {!isUndefined(props.visibleExternalIcon) && props.visibleExternalIcon ? (
          <div class="d-flex flex-row align-items-baseline">
            {props.children}
            <SVGIcon kind={SVGIconKind.Link} class={`ms-2 icon ${props.externalIconClassName}`} />
          </div>
        ) : (
          <>{props.children}</>
        )}
      </>
    );
  };

  return (
    <>
      {!isUndefined(props.btnType) && props.btnType ? (
        <button
          title={props.title}
          type="button"
          class={`btn p-0 link ${styles.link} ${props.class}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            if (props.onClick) props.onClick();

            if (isUndefined(props.disabled) || !props.disabled) {
              window.open(props.href, props.target || '_blank');
            }
          }}
          aria-label={props.label || 'Open external link'}
          aria-hidden={props.ariaHidden}
          tabIndex={-1}
        >
          {getData()}
        </button>
      ) : (
        <a
          title={props.title}
          class={`link ${styles.link} ${props.class}`}
          href={props.href}
          target={props.target || '_blank'}
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();

            if (props.onClick) props.onClick();
          }}
          aria-label={props.label || 'Open external link'}
          aria-hidden={props.ariaHidden}
          tabIndex={-1}
        >
          {getData()}
        </a>
      )}
    </>
  );
};

export default ExternalLink;

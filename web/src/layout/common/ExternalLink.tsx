import './ExternalLink.module.css';

import isUndefined from 'lodash/isUndefined';

import { SVGIconKind } from '../../types';
import SVGIcon from './SVGIcon';

interface Props {
  children: JSX.Element | JSX.Element[] | string;
  href: string;
  className?: string;
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
          <div className="d-flex flex-row align-items-baseline">
            {props.children}
            <SVGIcon kind={SVGIconKind.Link} className={`ms-2 icon ${props.externalIconClassName}`} />
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
          className={`btn p-0 link ${props.className}`}
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
          className={`link ${props.className}`}
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

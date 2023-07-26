import SVGIcon from './SVGIcon';
import './ExternalLink.module.css';
import { SVGIconKind } from '../../types';

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
        {props.visibleExternalIcon !== undefined && props.visibleExternalIcon ? (
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
      {props.btnType !== undefined && props.btnType ? (
        <button
          title={props.title}
          type="button"
          className={`btn p-0 link ${props.className}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            if (props.onClick) props.onClick();

            if (props.disabled === undefined || !props.disabled) {
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
          className={`link text-dark ${props.className}`}
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

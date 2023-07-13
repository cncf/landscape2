import { MouseEvent, useEffect, useRef, useState } from 'react';

import { useBodyScroll } from '../../hooks/useBodyScroll';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';
import classNames from 'classnames';

interface Props {
  open: boolean;
  header?: string | JSX.Element;
  headerClassName?: string;
  modalDialogClassName?: string;
  children: JSX.Element;
  footer?: JSX.Element;
  onClose: () => void;
  size?: string;
  noScrollable?: boolean;
  visibleContentBackdrop?: boolean;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick([ref], openStatus, () => {
    closeModal();
  });
  useBodyScroll(openStatus, 'modal');

  const closeModal = () => {
    props.onClose();
    setOpenStatus(false);
  };

  useEffect(() => {
    setOpenStatus(props.open);
  }, [props.open]);

  if (!props.open) return null;

  return (
    <>
      <div className={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />

      <div className={`modal d-block ${styles.modal} ${styles.active}`} role="dialog" aria-modal={true}>
        <div
          className={classNames(
            `modal-dialog modal-${props.size || 'lg'}`,
            {
              'modal-dialog-centered modal-dialog-scrollable': props.noScrollable === undefined || !props.noScrollable,
            },
            props.modalDialogClassName
          )}
          ref={ref}
        >
          <div className={`modal-content rounded-0 border border-2 mx-auto position-relative ${styles.content}`}>
            {props.header && (
              <div className={`modal-header rounded-0 d-flex flex-row align-items-center ${styles.header}`}>
                <div className={`modal-title h5 m-2 flex-grow-1 ${styles.headerContent}`}>{props.header}</div>

                <button
                  type="button"
                  title="Close modal"
                  className="btn-close"
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    closeModal();
                  }}
                  aria-label="Close"
                ></button>
              </div>
            )}

            <div className="modal-body p-4 h-100 d-flex flex-column">
              {props.header === undefined && (
                <div className={`position-absolute ${styles.btnCloseWrapper}`}>
                  <button
                    type="button"
                    title="Close modal"
                    className="btn-close"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              {props.children}
            </div>

            {props.footer !== undefined && <div className="modal-footer p-3">{props.footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;

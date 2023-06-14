import React, { MouseEvent, useEffect, useRef, useState } from 'react';

import { useBodyScroll } from '../../hooks/useBodyScroll';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';
import { Item } from '../../types';

export interface IModalProps {
  item?: Item;
  onClose: () => void;
  breakPoint?: string;
  size?: string;
  visibleContentBackdrop?: boolean;
}

export const Modal: React.FC<IModalProps> = (props: IModalProps) => {
  const [openStatus, setOpenStatus] = useState(props.item !== undefined);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick([ref], openStatus, () => {
    closeModal();
  });
  useBodyScroll(openStatus, 'modal', props.breakPoint);

  const closeModal = () => {
    props.onClose();
    // setOpenStatus(false);
  };

  useEffect(() => {
    setOpenStatus(props.item !== undefined);
  }, [props.item]);

  if (props.item === undefined) return null;

  return (
    <>
      <div className={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />

      <div className={`modal d-block ${styles.modal} ${styles.active}`} role="dialog" aria-modal={true}>
        <div
          className={`modal-dialog modal-${props.size || 'lg'} modal-dialog-centered modal-dialog-scrollable`}
          ref={ref}
        >
          <div
            className={`modal-content rounded-0 border border-3 mx-auto position-relative ${styles.content} ${styles.visibleContentBackdrop}`}
          >
            <div className={`modal-header rounded-0 d-flex flex-row align-items-center ${styles.header}`}>
              <div className="modal-title h5 m-2 flex-grow-1">Header</div>

              <button
                type="button"
                className="btn-close"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  closeModal();
                }}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body p-4 h-100 d-flex flex-column">Content</div>
          </div>
        </div>
      </div>
    </>
  );
};

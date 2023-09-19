import classNames from 'classnames';
import isNull from 'lodash/isNull';
import throttle from 'lodash/throttle';
import { MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { SVGIconKind } from '../../types';
import isElementInView from '../../utils/isElementInView';
import styles from './ButtonToTopScroll.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  firstSection: string | null;
}

const NAV_HEIGHT = 200;

const ButtonToTopScroll = (props: Props) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const checkScrollPosition = throttle(() => {
      setIsVisible(window.scrollY > NAV_HEIGHT);
    }, 500);
    window.addEventListener('scroll', checkScrollPosition);

    return () => window.removeEventListener('scroll', checkScrollPosition);
  }, []);

  if (isNull(props.firstSection)) return null;

  return (
    <div className={classNames('d-flex justify-content-end sticky-bottom', styles.sticky, { 'd-none': !isVisible })}>
      <div className={`position-relative ${styles.btnTopWrapper}`}>
        <button
          className={`btn btn-secondary btn-sm lh-1 text-white rounded-circle ${styles.btnTop}`}
          onClick={(e: MouseEvent) => {
            e.preventDefault();

            if (props.firstSection) {
              navigate(
                { ...location, hash: props.firstSection },
                {
                  replace: true,
                }
              );

              window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant',
              });

              if (!isElementInView(`btn_${props.firstSection}`)) {
                const target = window.document.getElementById(`btn_${props.firstSection}`);
                if (target) {
                  target.scrollBy({ top: 0, behavior: 'instant' });
                }

                const menu = window.document.getElementById('menu');
                if (menu) {
                  menu.scroll({
                    top: 0,
                    left: 0,
                    behavior: 'instant',
                  });
                }
              }
            }
          }}
        >
          <SVGIcon kind={SVGIconKind.ArrowTop} />
        </button>
      </div>
    </div>
  );
};

export default ButtonToTopScroll;

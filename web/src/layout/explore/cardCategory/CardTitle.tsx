import { throttle } from 'lodash';
import { useEffect, useRef, useState } from 'react';

import styles from './CardTitle.module.css';

interface Props {
  title: string;
}

const DEFAULT_FONT_SIZE = '1.15rem';

const CardTitle = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<string>(DEFAULT_FONT_SIZE);

  useEffect(() => {
    const updateTitleFont = () => {
      if (container && container.current) {
        if (container.current.offsetWidth < container.current.scrollWidth) {
          setFontSize('1rem');
        } else {
          setFontSize(DEFAULT_FONT_SIZE);
        }
      }
    };

    const checkFontSize = throttle(() => {
      updateTitleFont();
    }, 400);
    window.addEventListener('resize', checkFontSize);
    updateTitleFont();

    return () => window.removeEventListener('resize', checkFontSize);
  }, []);

  return (
    <div ref={container} className={`fw-semibold text-truncate pb-1 ${styles.title}`} style={{ fontSize: fontSize }}>
      {props.title}
    </div>
  );
};

export default CardTitle;

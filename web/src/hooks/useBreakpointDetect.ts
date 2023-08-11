import { throttle } from 'lodash';
import { useEffect, useState } from 'react';

import { Breakpoint } from '../types';

const getDeviceConfig = (width: number): Breakpoint | undefined => {
  if (width < 576) {
    return Breakpoint.XS;
  } else if (width >= 576 && width < 768) {
    return Breakpoint.SM;
  } else if (width >= 768 && width < 992) {
    return Breakpoint.MD;
  } else if (width >= 992 && width < 1200) {
    return Breakpoint.LG;
  } else if (width >= 1200 && width < 1400) {
    return Breakpoint.XL;
  } else if (width >= 1400) {
    return Breakpoint.XXL;
  } else if (width >= 1920) {
    return Breakpoint.XXXL;
  }
};

export const useBreakpointDetect = () => {
  const [brkPnt, setBrkPnt] = useState(() => getDeviceConfig(window.innerWidth));

  useEffect(() => {
    const calcInnerWidth = throttle(() => {
      setBrkPnt(getDeviceConfig(window.innerWidth));
    }, 200);
    window.addEventListener('resize', calcInnerWidth);

    return () => window.removeEventListener('resize', calcInnerWidth);
  }, []);

  return brkPnt;
};

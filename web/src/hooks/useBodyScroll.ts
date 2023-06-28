import { useEffect } from 'react';

export const useBodyScroll = (blocked: boolean, elType: string) => {
  const className = `noScroll-${elType}`;

  useEffect(() => {
    if (blocked) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }

    return () => {
      document.body.classList.remove(className);
    };
  }, [blocked, className]);
};

import { isNull } from 'lodash';
import { RefObject, useCallback, useEffect, useState } from 'react';

export const useOutsideClick = (
  refs: RefObject<HTMLElement>[],
  enabled: boolean,
  onClickOutside: (e: MouseEvent) => void
): [boolean] => {
  const [isActive, setActive] = useState(false);

  const isOutside = useCallback(
    (e: MouseEvent) => {
      const test = refs.map((ref) => {
        if (isNull(ref.current)) return true;
        return !ref.current.contains(e.target as HTMLElement);
      });

      return test.every(Boolean);
    },
    [refs]
  );

  const onEvent = useCallback(
    (e: MouseEvent) => {
      if (isOutside(e) && enabled) {
        setActive(true);
        onClickOutside(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('mousedown', onEvent);
    } else {
      document.removeEventListener('mousedown', onEvent);
    }

    return () => {
      document.removeEventListener('mousedown', onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return [isActive];
};

import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import reduce from 'lodash/reduce';

interface Props {
  [key: string]: unknown;
}

const arePropsEqual = (oldProps: Props, newProps: Props, ignored?: string[]) => {
  const tmpOldProps = { ...oldProps };
  const tmpNewProps = { ...newProps };

  if (!isUndefined(ignored)) {
    ignored.forEach((i: string) => {
      delete tmpOldProps[i];
      delete tmpNewProps[i];
    });
  }

  const diff = reduce(
    tmpOldProps,
    (result: string[], value: unknown, key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return isEqual(value, (tmpNewProps as any)[key]) ? result : result.concat(key);
    },
    []
  );
  return diff.length === 0;
};

export default arePropsEqual;

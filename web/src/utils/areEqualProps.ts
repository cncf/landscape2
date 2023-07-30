import { isEqual, reduce } from 'lodash';

interface Props {
  [key: string]: unknown;
}

const arePropsEqual = (oldProps: Props, newProps: Props) => {
  const diff = reduce(
    oldProps,
    (result: string[], value: unknown, key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return isEqual(value, (newProps as any)[key]) ? result : result.concat(key);
    },
    []
  );
  return diff.length === 0;
};

export default arePropsEqual;

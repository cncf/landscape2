import isUndefined from 'lodash/isUndefined';
import trim from 'lodash/trim';
import { useEffect, useState } from 'react';

import { BaseItem, Item } from '../../types';
import styles from './Table.module.css';

interface Props {
  keywords?: string[];
  items?: (BaseItem | Item)[];
}

const Table = (props: Props) => {
  const [items, setItems] = useState<(BaseItem | Item)[] | undefined>();

  useEffect(() => {
    if (!isUndefined(props.items)) {
      const filteredItems = props.items.filter((i: BaseItem | Item) => !isUndefined(i.maturity));
      if (filteredItems.length > 0) {
        setItems(filteredItems);
      }
    }
  }, [props.items]);

  if (isUndefined(props.keywords) && isUndefined(items)) return null;

  return (
    <table className="table table-bordered my-5">
      <thead>
        <tr>
          <th className={`w-50 ${styles.header}`} scope="col">
            {window.baseDS.foundation} Projects
          </th>
          <th className={`w-50 ${styles.header}`} scope="col">
            Keywords
          </th>
        </tr>
      </thead>
      <tbody className={styles.content}>
        <tr>
          <td className="py-4">
            {!isUndefined(items) ? (
              <ul className="mb-0 text-muted">
                {items.map((item: Item) => {
                  return (
                    <li key={`item_${item.id}`}>
                      {item.name} ({item.maturity})
                    </li>
                  );
                })}
              </ul>
            ) : (
              '-'
            )}
          </td>

          <td className="py-4">
            {!isUndefined(props.keywords) ? (
              <ul className="mb-0 text-muted">
                {props.keywords.map((buzzword: string) => (
                  <li key={`buzzword_${buzzword}`}>{trim(buzzword)}</li>
                ))}
              </ul>
            ) : (
              <>-</>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default Table;

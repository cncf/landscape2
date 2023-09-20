import classNames from 'classnames';
import isNull from 'lodash/isNull';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DEFAULT_TAB, TAB_PARAM } from '../../data';
import { BaseData, Tab } from '../../types';
import Explore from '../explore';
import Guide from '../guide';

interface Props {
  data: BaseData;
}

const Landscape = (props: Props) => {
  const [searchParams] = useSearchParams();
  const [loadedTabs, setLoadedTabs] = useState<Tab[]>([]);
  const activeTab: Tab =
    !isNull(searchParams.get(TAB_PARAM)) && Object.values(Tab).includes(searchParams.get(TAB_PARAM) as Tab)
      ? (searchParams.get(TAB_PARAM) as Tab)
      : DEFAULT_TAB;

  useEffect(() => {
    if (!loadedTabs.includes(activeTab)) {
      setLoadedTabs([...loadedTabs, activeTab]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="h-100">
      <div className={classNames({ 'd-none': activeTab !== Tab.Explore })}>
        {loadedTabs.includes(Tab.Explore) && <Explore data={props.data} isVisible={activeTab === Tab.Explore} />}
      </div>
      <div className={classNames({ 'd-none': activeTab !== Tab.Guide })}>
        {loadedTabs.includes(Tab.Guide) && <Guide isVisible={activeTab === Tab.Guide} />}
      </div>
    </div>
  );
};

export default Landscape;

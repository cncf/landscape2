import { memo } from 'react';

import { ViewMode } from '../../types';
import arePropsEqual from '../../utils/areEqualProps';
import { CategoriesData } from '../../utils/prepareData';
import CardCategory from './cardCategory';
import GridCategory from './gridCategory';

interface Props {
  containerWidth: number;
  fullDataReady: boolean;
  data: CategoriesData;
  selectedViewMode: ViewMode;
  cardWidth: number;
  categories_overridden?: string[];
}

// Memoized version of content to avoid unnecessary
const Content = memo(function Content(props: Props) {
  return (
    <>
      <div className={props.selectedViewMode === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <GridCategory
          containerWidth={props.containerWidth}
          data={props.data}
          cardWidth={props.cardWidth}
          categories_overridden={props.categories_overridden}
        />
      </div>
      <div className={props.selectedViewMode === ViewMode.Card ? 'd-block' : 'd-none'}>
        <CardCategory
          fullDataReady={props.fullDataReady}
          data={props.data}
          categories_overridden={props.categories_overridden}
          visible={props.selectedViewMode === ViewMode.Card}
        />
      </div>
    </>
  );
}, arePropsEqual);

export default Content;

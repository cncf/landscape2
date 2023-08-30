import { memo, useContext } from 'react';

import { ViewMode } from '../../types';
import arePropsEqual from '../../utils/areEqualProps';
import { CategoriesData } from '../../utils/prepareData';
import { ViewModeContext, ViewModeProps } from '../context/AppContext';
import CardCategory from './cardCategory';
import GridCategory from './gridCategory';

interface Props {
  isSelected: boolean;
  containerWidth: number;
  data: CategoriesData;
  categories_overridden?: string[];
}

// Memoized version of content to avoid unnecessary
const Content = memo(function Content(props: Props) {
  const { selectedViewMode } = useContext(ViewModeContext) as ViewModeProps;

  return (
    <>
      <div className={selectedViewMode === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <GridCategory
          containerWidth={props.containerWidth}
          data={props.data}
          categories_overridden={props.categories_overridden}
        />
      </div>
      <div className={selectedViewMode === ViewMode.Card ? 'd-block' : 'd-none'}>
        <CardCategory
          isVisible={props.isSelected && selectedViewMode === ViewMode.Card}
          data={props.data}
          categories_overridden={props.categories_overridden}
        />
      </div>
    </>
  );
}, arePropsEqual);

export default Content;

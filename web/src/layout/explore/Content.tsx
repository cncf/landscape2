import { memo, useContext } from 'react';

import { ViewMode } from '../../types';
import arePropsEqual from '../../utils/areEqualProps';
import { CategoriesData } from '../../utils/prepareData';
import { ViewModeContext, ViewModeProps } from '../context/AppContext';
import CardCategory from './card';
import GridCategory from './grid';

interface Props {
  isSelected: boolean;
  containerWidth: number;
  data: CategoriesData;
  categories_overridden?: string[];
  finishLoading: () => void;
}

// Memoized version of content to avoid unnecessary
const Content = memo(function Content(props: Props) {
  const { selectedViewMode } = useContext(ViewModeContext) as ViewModeProps;

  return (
    <>
      <div style={selectedViewMode === ViewMode.Grid ? { height: 'initial' } : { height: '0px', overflow: 'hidden' }}>
        <GridCategory
          isVisible={props.isSelected && selectedViewMode === ViewMode.Grid}
          containerWidth={props.containerWidth}
          data={props.data}
          categories_overridden={props.categories_overridden}
          finishLoading={props.finishLoading}
        />
      </div>
      <div style={selectedViewMode === ViewMode.Card ? { height: 'initial' } : { height: '0px', overflow: 'hidden' }}>
        <CardCategory
          isVisible={props.isSelected && selectedViewMode === ViewMode.Card}
          data={props.data}
          categories_overridden={props.categories_overridden}
          finishLoading={props.finishLoading}
        />
      </div>
    </>
  );
}, arePropsEqual);

export default Content;

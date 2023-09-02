import { memo, useContext } from 'react';

import { ViewMode } from '../../types';
import arePropsEqual from '../../utils/areEqualProps';
import { CategoriesData } from '../../utils/prepareData';
import { ViewModeContext, ViewModeProps } from '../context/AppContext';
import CardCategory from './cardCategory';
import GridCategory from './gridCategory';

interface Props {
  data: CategoriesData;
  categories_overridden?: string[];
  hideLoading: () => void;
}

// Memoized version of content to avoid unnecessary
const Content = memo(function Content(props: Props) {
  const { selectedViewMode } = useContext(ViewModeContext) as ViewModeProps;

  return (
    <>
      {(() => {
        switch (selectedViewMode) {
          case ViewMode.Grid:
            return (
              <GridCategory
                data={props.data}
                categories_overridden={props.categories_overridden}
                hideLoading={props.hideLoading}
              />
            );
          case ViewMode.Card:
            return (
              <CardCategory
                data={props.data}
                categories_overridden={props.categories_overridden}
                hideLoading={props.hideLoading}
              />
            );
          default:
            return null;
        }
      })()}
    </>
  );
}, arePropsEqual);

export default Content;

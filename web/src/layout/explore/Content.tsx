import isUndefined from 'lodash/isUndefined';

import { ViewMode } from '../../types';
import { CategoriesData } from '../../utils/prepareData';
import { useViewMode } from '../stores/viewMode';
import CardCategory from './card';
import GridCategory from './grid';

interface Props {
  group?: string;
  initialSelectedGroup?: string;
  data: CategoriesData;
  categories_overridden?: string[];
  finishLoading: () => void;
}

const Content = (props: Props) => {
  const selectedViewMode = useViewMode();
  const isSelected = () => isUndefined(props.group) || props.group === props.initialSelectedGroup;

  return (
    <div class={isSelected() ? 'd-block' : 'd-none'}>
      <div class={selectedViewMode() === ViewMode.Card ? 'd-block' : 'd-none'}>
        <CardCategory
          initialIsVisible={isSelected() && selectedViewMode() === ViewMode.Card}
          data={props.data}
          categories_overridden={props.categories_overridden}
          finishLoading={props.finishLoading}
        />
      </div>
      <div class={selectedViewMode() === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <GridCategory
          initialIsVisible={isSelected() && selectedViewMode() === ViewMode.Grid}
          data={props.data}
          categories_overridden={props.categories_overridden}
          finishLoading={props.finishLoading}
        />
      </div>
    </div>
  );
};

export default Content;

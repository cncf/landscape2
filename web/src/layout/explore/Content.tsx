import isUndefined from 'lodash/isUndefined';

import { ALL_OPTION } from '../../data';
import { CardMenu, ClassifiedOption, SortDirection, SortOption, ViewMode } from '../../types';
import { CategoriesData } from '../../utils/itemsDataGetter';
import { useViewMode } from '../stores/viewMode';
import CardCategory from './card';
import GridCategory from './grid';

interface Props {
  group?: string;
  initialSelectedGroup?: string;
  data: CategoriesData;
  cardData: unknown;
  categories_overridden?: string[];
  classified: ClassifiedOption;
  sorted: SortOption;
  direction: SortDirection;
  menu?: CardMenu;
}

const Content = (props: Props) => {
  const selectedViewMode = useViewMode();
  const isSelected = () => isUndefined(props.group) || props.group === props.initialSelectedGroup;

  return (
    <div class={isSelected() ? 'd-block' : 'd-none'}>
      <div class={selectedViewMode() === ViewMode.Card ? 'd-block' : 'd-none'}>
        <CardCategory
          initialIsVisible={isSelected() && selectedViewMode() === ViewMode.Card}
          group={props.group || ALL_OPTION}
          data={props.cardData}
          menu={props.menu}
          classified={props.classified}
          sorted={props.sorted}
          direction={props.direction}
        />
      </div>
      <div class={selectedViewMode() === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <GridCategory
          initialIsVisible={isSelected() && selectedViewMode() === ViewMode.Grid}
          data={props.data}
          categories_overridden={props.categories_overridden}
        />
      </div>
    </div>
  );
};

export default Content;

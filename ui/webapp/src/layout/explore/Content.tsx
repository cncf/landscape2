import isUndefined from 'lodash/isUndefined';

import { CardMenu, ClassifyOption, SortDirection, SortOption, ViewMode } from '../../types';
import { CardData, CategoriesData } from '../../utils/itemsDataGetter';
import { FeaturedGroupProvider } from '../stores/featuredItems';
import { useViewMode } from '../stores/viewMode';
import CardCategory from './card';
import GridCategory from './grid';

interface Props {
  group?: string;
  initialSelectedGroup?: string;
  data: CategoriesData;
  cardData?: CardData;
  categories_overridden?: string[];
  classify: ClassifyOption;
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
          data={props.cardData}
          menu={props.menu}
          classify={props.classify}
          sorted={props.sorted}
          direction={props.direction}
        />
      </div>
      <div class={selectedViewMode() === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <FeaturedGroupProvider group={props.group}>
          <GridCategory
            initialIsVisible={isSelected() && selectedViewMode() === ViewMode.Grid}
            data={props.data}
            categories_overridden={props.categories_overridden}
          />
        </FeaturedGroupProvider>
      </div>
    </div>
  );
};

export default Content;

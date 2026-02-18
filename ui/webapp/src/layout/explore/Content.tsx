import isUndefined from 'lodash/isUndefined';
import { Match, Show, Switch } from 'solid-js';

import { ALL_OPTION } from '../../data';
import { CardMenu, ClassifyOption, SortDirection, SortOption, ViewMode } from '../../types';
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
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
  menu?: CardMenu;
}

const Content = (props: Props) => {
  const selectedViewMode = useViewMode();
  const isSelected = () => isUndefined(props.group) || props.group === props.initialSelectedGroup;

  return (
    <Show when={isSelected()}>
      <Switch>
        <Match when={selectedViewMode() === ViewMode.Card}>
          <CardCategory
            initialIsVisible
            group={props.group || ALL_OPTION}
            data={props.cardData}
            menu={props.menu}
            classify={props.classify}
            sorted={props.sorted}
            direction={props.direction}
          />
        </Match>
        <Match when={selectedViewMode() === ViewMode.Grid}>
          <GridCategory initialIsVisible data={props.data} categories_overridden={props.categories_overridden} />
        </Match>
      </Switch>
    </Show>
  );
};

export default Content;

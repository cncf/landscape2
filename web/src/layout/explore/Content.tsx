import { BaseItem, ViewMode } from '../../types';
import { CategoriesData } from '../../utils/prepareBaseData';
import GridCategory from './gridCategory';
import CardCategory from './cardCategory';

interface Props {
  data: CategoriesData;
  selectedViewMode: ViewMode;
  cardWidth: number;
  categories_overridden?: string[];
  onClickItem: (item: BaseItem) => void;
}

const Content = (props: Props) => {
  return (
    <>
      {(() => {
        switch (props.selectedViewMode) {
          case ViewMode.Grid:
            return (
              <GridCategory
                data={props.data}
                cardWidth={props.cardWidth}
                categories_overridden={props.categories_overridden}
                onClickItem={props.onClickItem}
              />
            );
          case ViewMode.Card:
            return <CardCategory data={props.data} onClickItem={props.onClickItem} />;
        }
      })()}
    </>
  );
};

export default Content;

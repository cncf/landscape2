import { ViewMode } from '../../types';
import { CategoriesData } from '../../utils/prepareData';
import GridCategory from './gridCategory';
import CardCategory from './cardCategory';

interface Props {
  fullDataReady: boolean;
  data: CategoriesData;
  selectedViewMode: ViewMode;
  cardWidth: number;
  categories_overridden?: string[];
  onClickItem: (itemId: string) => void;
}

const Content = (props: Props) => {
  return (
    <>
      {(() => {
        switch (props.selectedViewMode) {
          case ViewMode.Grid:
            return (
              <GridCategory
                fullDataReady={props.fullDataReady}
                data={props.data}
                cardWidth={props.cardWidth}
                categories_overridden={props.categories_overridden}
                onClickItem={props.onClickItem}
              />
            );
          case ViewMode.Card:
            return (
              <CardCategory
                fullDataReady={props.fullDataReady}
                data={props.data}
                categories_overridden={props.categories_overridden}
                onClickItem={props.onClickItem}
              />
            );
        }
      })()}
    </>
  );
};

export default Content;

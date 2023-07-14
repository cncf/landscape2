import { ViewMode } from '../../types';
import { CategoriesData } from '../../utils/prepareData';
import GridCategory from './gridCategory';
import CardCategory from './cardCategory';

interface Props {
  containerWidth: number;
  fullDataReady: boolean;
  data: CategoriesData;
  selectedViewMode: ViewMode;
  cardWidth: number;
  categories_overridden?: string[];
}

const Content = (props: Props) => {
  return (
    <>
      <div className={props.selectedViewMode === ViewMode.Grid ? 'd-block' : 'd-none'}>
        <GridCategory
          containerWidth={props.containerWidth}
          fullDataReady={props.fullDataReady}
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
        />
      </div>
    </>
  );
};

export default Content;

import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { Link } from 'react-router-dom';

import { SVGIconKind } from '../../../types';
import generateColorsArray from '../../../utils/generateColorsArray';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import { CategoriesData } from '../../../utils/prepareData';
import SVGIcon from '../../common/SVGIcon';
import Grid from './Grid';
import styles from './GridCategory.module.css';

interface Props {
  containerWidth: number;
  data: CategoriesData;
  cardWidth: number;
  categories_overridden?: string[];
}

const GridCategory = (props: Props) => {
  const colorsList = generateColorsArray(Object.keys(props.data).length);

  return (
    <>
      {Object.keys(props.data).map((cat: string, index: number) => {
        const isOverriden = !isUndefined(props.categories_overridden) && props.categories_overridden.includes(cat);
        const subcategories: SubcategoryDetails[] = [];
        Object.keys(props.data[cat]).forEach((subcat: string) => {
          if (props.data[cat][subcat].items.length !== 0) {
            subcategories.push({
              name: subcat,
              itemsCount: props.data[cat][subcat].itemsCount,
              itemsFeaturedCount: props.data[cat][subcat].itemsFeaturedCount,
            });
          }
        });

        if (subcategories.length === 0) return null;

        return (
          <div key={`cat_${cat}`} className="d-flex flex-row">
            <div
              className={classNames(
                'text-white border border-3 border-white fw-semibold p-2 border-end-0 py-5',
                styles.catTitle,
                { 'border-bottom-0': index !== 0 }
              )}
              style={{ backgroundColor: colorsList[index] }}
            >
              <div className="d-flex flex-row align-items-start justify-content-end">
                <div>{cat}</div>

                <div>
                  <Link
                    to="/guide"
                    className={`btn btn-link text-white opacity-75 px-0 p-0 mt-2 disabled ${styles.btnIcon} ${styles.btnInCatTitle}`}
                  >
                    <SVGIcon kind={SVGIconKind.Guide} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column align-items-stretch w-100">
              <Grid
                containerWidth={props.containerWidth}
                itemWidth={props.cardWidth}
                categoryName={cat}
                isOverriden={isOverriden}
                subcategories={subcategories}
                categoryData={props.data[cat]}
                backgroundColor={colorsList[index]}
                categoryIndex={index}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default GridCategory;

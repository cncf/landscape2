import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { memo, useEffect, useState } from 'react';

import arePropsEqual from '../../../utils/areEqualProps';
import cutString from '../../../utils/cutString';
import generateColorsArray from '../../../utils/generateColorsArray';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import { CategoriesData } from '../../../utils/prepareData';
import Grid from './Grid';
import styles from './GridCategory.module.css';

interface Props {
  containerWidth: number;
  data: CategoriesData;
  categories_overridden?: string[];
  isVisible: boolean;
  finishLoading: () => void;
}

const GridCategory = memo(function GridCategory(props: Props) {
  const colorsList = generateColorsArray(Object.keys(props.data).length);
  const [firstLoad, setFirstLoad] = useState<boolean>(props.isVisible);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (props.isVisible !== isVisible) {
      setIsVisible(props.isVisible);
      if (props.isVisible) {
        props.finishLoading();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isVisible]);

  useEffect(() => {
    if (!firstLoad && isVisible) {
      setFirstLoad(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <>
      {firstLoad && (
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
                    'text-white border border-3 border-white fw-medium border-end-0 d-flex flex-row align-items-center justify-content-end',
                    styles.catTitle,
                    { 'border-bottom-0': index !== 0 },
                    { 'border-top-0': index === Object.keys(props.data).length - 1 }
                  )}
                  style={{ backgroundColor: colorsList[index] }}
                >
                  <div className={`text-center ${styles.catTitleText}`}>{cutString(cat, 33)}</div>

                  {/* <div>
                      <Link
                        to="/guide"
                        className={`btn btn-link text-white opacity-75 px-0 p-0 mt-2 disabled ${styles.btnIcon} ${styles.btnInCatTitle}`}
                      >
                        <SVGIcon kind={SVGIconKind.Guide} />
                      </Link>
                    </div> */}
                </div>

                <div className="d-flex flex-column w-100 align-items-stretch">
                  <Grid
                    containerWidth={props.containerWidth}
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
      )}
    </>
  );
}, arePropsEqual);

export default GridCategory;

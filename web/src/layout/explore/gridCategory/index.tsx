import classNames from 'classnames';
import styles from './GridCategory.module.css';
import generateColorsArray from '../../../utils/generateColorsArray';
import { Link } from 'react-router-dom';
import { CategoriesData } from '../../../utils/prepareData';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import Grid from './Grid';

interface Props {
  containerWidth: number;
  fullDataReady: boolean;
  data: CategoriesData;
  cardWidth: number;
  categories_overridden?: string[];
}

const GridCategory = (props: Props) => {
  const colorsList = generateColorsArray(Object.keys(props.data).length);

  return (
    <>
      {Object.keys(props.data).map((cat: string, index: number) => {
        const isOverriden = props.categories_overridden !== undefined && props.categories_overridden.includes(cat);
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
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 16 16"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.5 2H9l-.35.15-.65.64-.65-.64L7 2H1.5l-.5.5v10l.5.5h5.29l.86.85h.7l.86-.85h5.29l.5-.5v-10l-.5-.5zm-7 10.32l-.18-.17L7 12H2V3h4.79l.74.74-.03 8.58zM14 12H9l-.35.15-.14.13V3.7l.7-.7H14v9zM6 5H3v1h3V5zm0 4H3v1h3V9zM3 7h3v1H3V7zm10-2h-3v1h3V5zm-3 2h3v1h-3V7zm0 2h3v1h-3V9z"
                      ></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column align-items-stretch w-100">
              <Grid
                fullDataReady={props.fullDataReady}
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

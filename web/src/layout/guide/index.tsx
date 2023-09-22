import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Waypoint } from 'react-waypoint';

import { CategoryGuide, Guide, SubcategoryGuide, ToCTitle } from '../../types';
import goToElement from '../../utils/goToElement';
import isElementInView from '../../utils/isElementInView';
import itemsDataGetter from '../../utils/itemsDataGetter';
import slugify from '../../utils/slugify';
import sortItemsByOrderValue from '../../utils/sortItemsByOrderValue';
import ButtonToTopScroll from '../common/ButtonToTopScroll';
import { Loading } from '../common/Loading';
import Footer from '../navigation/Footer';
import styles from './Guide.module.css';
import SubcategoryGrid from './SubcategoryGrid';
import Table from './Table';
import ToC from './ToC';

interface Props {
  isVisible?: boolean;
}

interface WaypointProps {
  id: string;
  children: JSX.Element;
}

const WaypointItem = (props: WaypointProps) => {
  const navigate = useNavigate();

  const handleEnter = () => {
    if (`#${props.id}` !== location.hash) {
      navigate(
        { ...location, hash: props.id },
        {
          replace: true,
        }
      );

      if (!isElementInView(`btn_${props.id}`)) {
        const target = window.document.getElementById(`btn_${props.id}`);
        if (target) {
          target.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  };

  return (
    <Waypoint topOffset="20px" bottomOffset="97%" onEnter={handleEnter} fireOnRapidScroll={false}>
      {props.children}
    </Waypoint>
  );
};

const Guide = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = location.state && location.state.from ? location.state.from : undefined;
  const [guide, setGuide] = useState<Guide | null | undefined>();
  const [toc, setToc] = useState<ToCTitle[]>([]);

  useEffect(() => {
    const prepareToC = (data: Guide) => {
      let activeTitle: string;
      const content: ToCTitle[] = [];
      data.categories.forEach((cat: CategoryGuide) => {
        const subcategories: ToCTitle[] = [];
        if (cat.subcategories) {
          cat.subcategories.forEach((subcat: SubcategoryGuide) => {
            subcategories.push({
              title: subcat.subcategory,
              id: slugify(`${cat.category} ${subcat.subcategory}`),
            });
          });
        }

        content.push({
          title: cat.category,
          id: slugify(cat.category),
          options: subcategories,
        });

        if (!isUndefined(activeTitle)) {
          activeTitle = slugify(cat.category);
          updateRoute(activeTitle);
        }
      });

      setToc(content);
    };

    async function fetchGuide() {
      try {
        fetch(import.meta.env.MODE === 'development' ? '../../static/guide.json' : './data/guide.json')
          .then((res) => res.json())
          .then((data) => {
            setGuide(data);
            prepareToC(data);
          });
      } catch {
        setGuide(null);
      }
    }

    fetchGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRoute = (title: string) => {
    navigate(
      { ...location, hash: title },
      {
        replace: true,
      }
    );
  };

  const updateActiveTitle = useCallback((title: string) => {
    goToElement(title, 16);
    updateRoute(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollInToC = () => {
    const cleanHash = location.hash.replace('#', '');
    if (!isElementInView(`btn_${cleanHash}`)) {
      const target = window.document.getElementById(`btn_${cleanHash}`);
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  useEffect(() => {
    if (props.isVisible) {
      if (fromPage) {
        if (fromPage === 'explore') {
          const cleanHash = location.hash.replace('#', '');
          updateActiveTitle(cleanHash);
          scrollInToC();
        } else if (fromPage === 'header' && toc.length > 0) {
          updateRoute(toc[0].id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isVisible]);

  useEffect(() => {
    if (toc.length > 0) {
      const firstItem = toc[0].id;
      if (location.hash) {
        if (location.hash !== '' && location.hash !== `#${firstItem}`) {
          const cleanHash = location.hash.replace('#', '');
          scrollInToC();
          goToElement(cleanHash);
        } else {
          updateRoute(toc[0].id);
        }
      } else {
        updateRoute(toc[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toc]);

  return (
    <>
      <main className="flex-grow-1 container-fluid d-none d-lg-block px-4 position-relative">
        <div className={classNames('d-flex flex-row', { [styles.loadingContent]: isUndefined(guide) })}>
          {isUndefined(guide) ? (
            <Loading spinnerClassName="position-fixed top-50 start-50" />
          ) : (
            <>
              <ToC toc={toc} updateActiveTitle={updateActiveTitle} />
              <div className="p-4 pe-0">
                <div className={`position-relative ${styles.guide}`}>
                  {guide?.categories.map((cat: CategoryGuide, index: number) => {
                    const key = slugify(cat.category);

                    return (
                      <div key={key} className={styles.catSection}>
                        <WaypointItem id={key}>
                          <div id={key}>
                            <h1
                              className={classNames('border-bottom mb-4 pb-2', styles.title, {
                                'mt-5': index !== 0,
                              })}
                            >
                              {cat.category}
                            </h1>
                            {!isUndefined(cat.content) && <div dangerouslySetInnerHTML={{ __html: cat.content }} />}
                          </div>
                        </WaypointItem>
                        {!isUndefined(cat.subcategories) && cat.subcategories.length > 0 && (
                          <>
                            {cat.subcategories.map((subcat: SubcategoryGuide) => {
                              const items = itemsDataGetter.filterItemsBySection({
                                category: cat.category,
                                subcategory: subcat.subcategory,
                              });

                              const sortedItems =
                                !isUndefined(items) && items.length > 0 ? sortItemsByOrderValue(items) : undefined;

                              const key = slugify(`${cat.category} ${subcat.subcategory}`);

                              return (
                                <Fragment key={key}>
                                  <WaypointItem id={key}>
                                    <div id={key}>
                                      <h2 className={`mt-5 mb-4 pb-2 border-bottom ${styles.subtitle}`}>
                                        {subcat.subcategory}
                                      </h2>
                                      <div dangerouslySetInnerHTML={{ __html: subcat.content }} />
                                      <Table keywords={subcat.keywords} items={sortedItems} />
                                      <SubcategoryGrid items={sortedItems} />
                                    </div>
                                  </WaypointItem>
                                </Fragment>
                              );
                            })}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {toc.length > 0 && <ButtonToTopScroll firstSection={toc[0].id} />}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      {!isUndefined(guide) && <Footer logo={window.baseDS.images.footer_logo} />}
    </>
  );
};

export default Guide;

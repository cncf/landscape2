import classNames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Link, useSearchParams } from 'react-router-dom';

import { DEFAULT_TAB, TAB_PARAM } from '../../data';
import { BaseItem, SVGIconKind, Tab } from '../../types';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import styles from './Header.module.css';

interface Props {
  logo: string;
  items: BaseItem[];
}

const Header = (props: Props) => {
  const [searchParams] = useSearchParams();
  const activeTab: Tab =
    !isNull(searchParams.get(TAB_PARAM)) && Object.values(Tab).includes(searchParams.get(TAB_PARAM) as Tab)
      ? (searchParams.get(TAB_PARAM) as Tab)
      : DEFAULT_TAB;

  return (
    <header className="navbar navbar-expand border-bottom p-0 shadow-sm mb-2">
      <div className="container-fluid d-flex align-items-center p-4">
        <div className="mx-auto mx-md-0">
          <Link to="/">
            <img
              className={styles.logo}
              src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
              alt="Landscape logo"
            />
          </Link>
        </div>

        <div className="d-none d-md-flex align-items-center">
          <Link
            className={classNames(
              'btn btn-link position-relative ms-4 ms-xl-5 text-uppercase fw-bold text-decoration-none p-0',
              styles.link,
              { [styles.active]: activeTab === Tab.Explore }
            )}
            to="/"
          >
            Explore
          </Link>
          {!isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary) && (
            <Link
              className={classNames(
                'btn btn-link position-relative ms-4 ms-xl-5 text-uppercase fw-bold text-decoration-none p-0',
                styles.link,
                { [styles.active]: activeTab === Tab.Guide }
              )}
              to="/?tab=guide"
              state={{ from: 'header' }}
            >
              Guide
            </Link>
          )}
        </div>

        <div className={`d-none d-md-flex flex-row align-items-center ms-auto ${styles.searchWrapper}`}>
          <div className="d-none d-lg-block position-relative me-2 me-xl-4">
            <Searchbar items={props.items} />
          </div>
          <ExternalLink
            className="btn btn-md text-dark fs-5 ms-2 ms-xl-4 px-0"
            href="https://github.com/cncf/landscape2"
          >
            <SVGIcon kind={SVGIconKind.GitHub} className={`position-relative ${styles.githubIcon}`} />
          </ExternalLink>
        </div>
      </div>
    </header>
  );
};

export default Header;

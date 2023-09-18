import { NavLink } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { BaseItem, SVGIconKind } from '../../types';
import ExternalLink from '../common/ExternalLink';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import styles from './Header.module.css';

interface Props {
  logo: string;
  items: BaseItem[];
}

const Header = (props: Props) => {
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
          <NavLink
            className={`btn btn-link position-relative ms-4 ms-xl-5 text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
            to="/"
          >
            Explore
          </NavLink>
          {/* <NavLink
            className={`btn btn-link position-relative ms-3 ms-xl-4 text-uppercase fw-bold text-decoration-none p-0 disabled ${styles.link}`}
            to="/guide"
          >
            Guide
          </NavLink> */}
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

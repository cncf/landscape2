import { NavLink } from 'react-router-dom';
import { Link } from 'react-router-dom';

import logo from '../../assets/images/landscape-logo.svg';
import { BaseItem, SVGIconKind } from '../../types';
import Searchbar from '../common/Searchbar';
import SVGIcon from '../common/SVGIcon';
import styles from './Header.module.css';

interface Props {
  items: BaseItem[];
}

const Header = (props: Props) => {
  return (
    <header className="navbar navbar-expand border-bottom p-0 shadow-sm mb-2">
      <div className="container-fluid d-flex align-items-center p-4">
        <div className="mx-auto mx-md-0">
          <Link to="/">
            <img className={styles.logo} src={logo} alt="Landscape logo" />
          </Link>
        </div>

        <div className="d-none d-md-flex align-items-center">
          <NavLink
            className={`btn btn-link position-relative ms-4 ms-xl-5 text-light text-uppercase fw-bold text-decoration-none p-0 ${styles.link}`}
            to="/"
          >
            Explore
          </NavLink>
          <NavLink
            className={`btn btn-link position-relative ms-3 ms-xl-4 text-light text-uppercase fw-bold text-decoration-none p-0 disabled ${styles.link}`}
            to="/guide"
          >
            Guide
          </NavLink>
        </div>

        <div className={`d-none d-md-flex flex-row align-items-center ms-auto ${styles.searchWrapper}`}>
          <div className="d-none d-lg-block position-relative me-2 me-xl-4">
            <Searchbar items={props.items} />
          </div>
          <a
            className={`btn btn-md text-dark fs-5 ms-2 ms-xl-4 px-0`}
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Github link"
          >
            <SVGIcon kind={SVGIconKind.GitHub} className={`position-relative ${styles.githubIcon}`} />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;

import { FilterSection } from '../../types';
import styles from './Section.module.css';

interface Props {
  section: FilterSection;
}

const Section = (props: Props) => {
  return (
    <div className={`fw-bold text-uppercase text-primary ${styles.categoryTitle}`}>
      <small>{props.section.title}</small>
    </div>
  );
};

export default Section;

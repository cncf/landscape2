import { FILTERS } from '../../data';
import { FilterSection } from '../../types';
import Section from './Section';

const Filters = () => {
  return (
    <aside className="border border-1 py-3 px-2 me-3">
      <div className="text-uppercase fw-bold border-bottom pb-2 mb-4">Filters</div>

      {FILTERS.map((section: FilterSection) => {
        return <Section section={section} />;
      })}
    </aside>
  );
};

export default Filters;

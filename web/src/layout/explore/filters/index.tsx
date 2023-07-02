import { FILTERS } from '../../../data';
import { ActiveFilters, FilterCategory, FilterSection } from '../../../types';
import Section from './Section';

interface Props {
  activeFilters: ActiveFilters;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
}

const Filters = (props: Props) => {
  return (
    <>
      {FILTERS.map((section: FilterSection) => {
        return (
          <Section
            key={`section_${section.value}`}
            section={section}
            activeFilters={props.activeFilters[section.value]}
            updateActiveFilters={props.updateActiveFilters}
          />
        );
      })}
    </>
  );
};

export default Filters;

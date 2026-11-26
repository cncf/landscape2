import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { ExternalLink } from '../ExternalLink';
import { Image } from '../Image';
import { hasClomonitorReport } from './helpers';
import { Section } from './Section';
import type { SectionVariant } from './styles';

interface Props {
  foundation: string;
  item: Item;
  variant: SectionVariant;
}

const MobileReport = css`
  max-width: 100%;
`;

/** CLOMonitor report summary of the item, linking to its CLOMonitor page; hidden when there is no report. */
export const ClomonitorSection = (props: Props) => (
  <Show when={hasClomonitorReport(props.item)}>
    <Section title="CLOMonitor report summary" variant={props.variant}>
      <div class="my-2 d-flex justify-content-center w-100 align-items-center">
        <ExternalLink
          href={`https://clomonitor.io/projects/${props.foundation.toLowerCase()}/${props.item.clomonitor_name}`}
        >
          <Image
            alt={`CLOMonitor report summary for ${props.item.name}`}
            logo={props.item.clomonitor_report_summary!}
            class={props.variant === 'mobile' ? MobileReport : undefined}
          />
        </ExternalLink>
      </div>
    </Section>
  </Show>
);

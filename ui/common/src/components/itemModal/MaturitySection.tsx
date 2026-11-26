import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { Section } from './Section';
import type { SectionVariant } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

// Maturity levels the section shows the timeline of
const TIMELINE_LEVELS = ['sandbox', 'incubating', 'graduated'];

const Wrapper = css`
  .incubatingLine::after {
    right: 50%;
  }

  .sandboxLine::after {
    display: none;
  }
`;

const MaturityBadge: Record<SectionVariant, string> = {
  desktop: css`
    width: 100px;
    background-color: var(--bs-gray-500);
  `,
  mobile: css`
    width: 80px;
    font-size: 0.65rem !important;
    line-height: 1rem !important;
    background-color: var(--bs-gray-500);
  `,
};

const ActiveMaturityBadge = css`
  position: relative;
  background-color: var(--color-stats-1) !important;
`;

const StatusLegend: Record<SectionVariant, string> = {
  desktop: css`
    font-size: 0.7rem;
  `,
  mobile: css`
    font-size: 0.6rem;
  `,
};

const Line = css`
  &::after {
    position: absolute;
    content: '';
    top: 0.7rem;
    left: 0;
    right: 0;
    height: 4px;
    background-color: var(--color-stats-1);
    z-index: -1;
  }

  &::before {
    position: absolute;
    content: '';
    top: 0.7rem;
    left: 0;
    right: 0;
    height: 4px;
    background-color: var(--bs-gray-200);
    z-index: -1;
  }
`;

/**
 * Maturity timeline of a sandbox, incubating or graduated project with at least one maturity date.
 * Archived projects and projects without dates show nothing.
 */
export const MaturitySection = (props: Props) => {
  const maturity = () => props.item.maturity;
  const isVisible = () =>
    maturity() !== undefined &&
    TIMELINE_LEVELS.includes(maturity()!) &&
    (props.item.accepted_at !== undefined ||
      props.item.incubating_at !== undefined ||
      props.item.graduated_at !== undefined);
  // The sandbox date is hidden when the project joined directly at a later level
  const acceptedAt = () =>
    !props.item.accepted_at ||
    props.item.accepted_at === props.item.incubating_at ||
    props.item.accepted_at === props.item.graduated_at
      ? '-'
      : props.item.accepted_at;
  const badgeClass = () =>
    `badge rounded-0 ${props.variant === 'desktop' ? 'p-2' : ''} ${MaturityBadge[props.variant]}`;
  const legendClass = () =>
    `text-uppercase fw-semibold text-muted ${props.variant === 'desktop' ? 'mt-2' : 'mt-1'} ${StatusLegend[props.variant]}`;

  return (
    <Show when={isVisible()}>
      <Section title="Maturity" variant={props.variant}>
        <div class={`position-relative ${props.variant === 'desktop' ? 'mt-2' : 'my-2'} ${Wrapper}`}>
          <div class="d-flex flex-row justify-content-between">
            <div class="d-flex flex-column align-items-center">
              <div class={`${badgeClass()} ${ActiveMaturityBadge}`}>{acceptedAt()}</div>
              <small class={legendClass()}>Sandbox</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div
                class={badgeClass()}
                classList={{ [ActiveMaturityBadge]: maturity() === 'incubating' || maturity() === 'graduated' }}
              >
                {props.item.incubating_at || '-'}
              </div>
              <small class={legendClass()}>Incubating</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div class={badgeClass()} classList={{ [ActiveMaturityBadge]: maturity() === 'graduated' }}>
                {props.item.graduated_at || '-'}
              </div>
              <small class={legendClass()}>Graduated</small>
            </div>
          </div>
          <div class={`${Line} ${maturity()}Line`} />
        </div>
      </Section>
    </Show>
  );
};

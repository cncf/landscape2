import { createMemo, For, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { ExternalLink } from '../ExternalLink';
import { Section } from './Section';
import { type SectionVariant, TableContent, TableLayout, Thead } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

const TableLink = css`
  font-size: 0.8rem !important;
`;

const AuditsCol = css`
  width: 120px;
`;

const AuditsColMd = css`
  width: 200px;
`;

/**
 * Security audits of the item, newest first. Desktop shows the date, type, vendor and url columns; mobile
 * shows the date (linking to the report) and the vendor.
 */
export const AuditsSection = (props: Props) => {
  const audits = createMemo(() =>
    [...(props.item.audits ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  );

  return (
    <Show when={audits().length > 0}>
      <Section title="Security audits" variant={props.variant}>
        <div class="w-100">
          <table class={`table table-sm table-striped table-bordered mt-3 ${TableLayout}`}>
            <thead class={`text-uppercase text-muted ${Thead}`}>
              <Show
                when={props.variant === 'desktop'}
                fallback={
                  <tr>
                    <th class="text-center" scope="col">
                      Date
                    </th>
                    <th class="text-center" scope="col">
                      Vendor
                    </th>
                  </tr>
                }
              >
                <tr>
                  <th class={`text-center ${AuditsCol}`} scope="col">
                    Date
                  </th>
                  <th class={`text-center ${AuditsCol}`} scope="col">
                    Type
                  </th>
                  <th class={`text-center ${AuditsColMd}`} scope="col">
                    Vendor
                  </th>
                  <th class="text-center" scope="col">
                    Url
                  </th>
                </tr>
              </Show>
            </thead>
            <tbody>
              <For each={audits()}>
                {(audit) => (
                  <tr class={TableContent[props.variant]}>
                    <Show
                      when={props.variant === 'desktop'}
                      fallback={
                        <>
                          <td class="px-3 text-center text-nowrap">
                            <ExternalLink class="text-muted d-block text-decoration-underline" href={audit.url}>
                              {audit.date}
                            </ExternalLink>
                          </td>
                          <td class="px-3 text-center text-nowrap">
                            <div class="w-100 text-truncate">{audit.vendor}</div>
                          </td>
                        </>
                      }
                    >
                      <td class="px-3 text-center text-nowrap">{audit.date}</td>
                      <td class="px-3 text-center text-uppercase">{audit.type}</td>
                      <td class="px-3 text-center text-nowrap">
                        <div class="w-100 text-truncate">{audit.vendor}</div>
                      </td>
                      <td class="px-3">
                        <div class="w-100">
                          <ExternalLink
                            class={`text-muted text-truncate d-block text-decoration-underline ${TableLink}`}
                            href={audit.url}
                          >
                            {audit.url}
                          </ExternalLink>
                        </div>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Section>
    </Show>
  );
};

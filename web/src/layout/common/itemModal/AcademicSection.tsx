import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';
import ExternalLink from '../ExternalLink';
import styles from './AcademicSection.module.css';
import prettifyNumber from '../../../utils/prettifyNumber';
import Box from './Box';
import { Item, Academic } from '../../../types';

interface Props {
  item: Item;
  class: string;
}

const AcademicSection = (props: Props) => {
  const primary = () => props.item.academics && props.item.academics.length > 0 ? props.item.academics[0] : undefined;
  return (
    <Show when={!isUndefined(props.item.academics) && props.item.academics.length > 0}>
      <div class={`position-relative border ${styles.fieldset}`}>
        <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Scholars</div>

        <div class={`fw-bold text-uppercase mt-2 mb-3 ${styles.titleInSection}`}>Leader</div>
        <div class="d-flex flex-row align-items-center my-2">
          <ExternalLink class="text-reset p-0 align-baseline fw-semibold" href={primary()!.profile_url}>
            {primary()!.name}
          </ExternalLink>
        </div>

        <div class="row g-4 my-0 mb-2">
          <Box value={prettifyNumber(primary()!.citations, 1)} legend="Citations" />
          <Box value={prettifyNumber(primary()!.hindex, 1)} legend="h-index" />
          <Box value={!isUndefined(primary()!.i10index) ? prettifyNumber(primary()!.i10index!, 1) : "-"} legend="i10-index" />
          <Box value={"-"} legend="-" />
          <Box value={"-"} legend="-" />
        </div>

        <Show when={props.item.academics!.length > 1}>
          <div class="mt-4">
            <div class={`fw-bold text-uppercase ${styles.titleInSection}`}>Team</div>
            <table class={`table table-sm table-striped table-bordered mt-3 ${styles.tableLayout}`}>
              <thead class={`text-uppercase text-muted ${styles.thead}`}>
                <tr>
                  <th class="text-center" scope="col">
                    Name
                  </th>
                  <th class={`text-center ${styles.reposCol}`} scope="col">
                    Citations
                  </th>
                  <th class={`text-center text-nowrap ${styles.reposCol}`} scope="col">
                    h-index
                  </th>
                  <th class={`text-center text-nowrap ${styles.reposCol}`} scope="col">
                    i10-index
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={props.item.academics!}>
                  {(q: Academic, i) => {
                    if (i() == 0) {
                      return;
                    }
                    return (
                      <tr class={styles.tableContent}>
                        <td class="px-3">
                          <ExternalLink class={`text-muted text-truncate d-block ${styles.tableLink}`} href={q.profile_url}>
                            {q.name}
                          </ExternalLink>
                        </td>
                        <td class="px-3 text-center text-nowrap">{prettifyNumber(q.citations, 1)}</td>
                        <td class="px-3 text-center text-nowrap">{prettifyNumber(q.hindex, 1)}</td>
                        <td class="px-3 text-center text-nowrap">{!isUndefined(q.i10index) ? prettifyNumber(q.i10index!, 1) : "-"}</td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default AcademicSection;

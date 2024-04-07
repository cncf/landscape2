import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { Item } from '../../../types';
import styles from './MaturitySection.module.css';

interface Props {
  item: Item;
  class: string;
}

const MaturitySection = (props: Props) => {
  return (
    <Show
      when={
        !isUndefined(props.item.maturity) &&
        ['experimental', 'incubating', 'stable'].includes(props.item.maturity) &&
        (!isUndefined(props.item.accepted_at) ||
          !isUndefined(props.item.incubating_at) ||
          !isUndefined(props.item.graduated_at))
      }
    >
      <div class={`position-relative border ${props.class}`}>
        <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>成熟度</div>

        <div class="position-relative mt-2">
          <div class="d-flex flex-row justify-content-between">
            <div class="d-flex flex-column align-items-center">
              <div class={`badge rounded-0 p-2 ${styles.maturityBadge} ${styles.activeMaturityBadge}`}>
                <Show when={props.item.accepted_at} fallback={'-'}>
                  <>
                    {props.item.accepted_at === props.item.incubating_at ||
                    props.item.accepted_at === props.item.graduated_at
                      ? '-'
                      : props.item.accepted_at}
                  </>
                </Show>
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>Experimental</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div
                class={`badge rounded-0 p-2 ${styles.maturityBadge}`}
                classList={{
                  [styles.activeMaturityBadge]: ['incubating', 'stable', 'archived'].includes(props.item.maturity!),
                }}
              >
                {props.item.incubating_at || '-'}
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>Incubating</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div
                class={`badge rounded-0 p-2 ${styles.maturityBadge}`}
                classList={{
                  [styles.activeMaturityBadge]: ['stable', 'archived'].includes(props.item.maturity!),
                }}
              >
                {props.item.graduated_at || '-'}
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>Stable</small>
            </div>
          </div>
          <div class={`${styles.line} ${props.item.maturity}Line`} />
        </div>
      </div>
    </Show>
  );
};

export default MaturitySection;

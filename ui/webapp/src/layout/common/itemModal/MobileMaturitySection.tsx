import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import { Item } from '../../../types';
import styles from './MobileMaturitySection.module.css';

interface Props {
  item: Item;
  titleClass: string;
}

const MobileMaturitySection = (props: Props) => {
  return (
    <Show
      when={
        !isUndefined(props.item.maturity) &&
        ['sandbox', 'incubating', 'graduated'].includes(props.item.maturity) &&
        (!isUndefined(props.item.accepted_at) ||
          !isUndefined(props.item.incubating_at) ||
          !isUndefined(props.item.graduated_at))
      }
    >
      <div class={`text-uppercase mt-3 fw-semibold border-bottom ${props.titleClass}`}>Maturity</div>

      <div class="position-relative my-2">
        <div class="d-flex flex-row justify-content-between">
          <div class="d-flex flex-column align-items-center">
            <div class={`badge rounded-0 ${styles.maturityBadge} ${styles.activeMaturityBadge}`}>
              <Show when={props.item.accepted_at} fallback={'-'}>
                <>
                  {props.item.accepted_at === props.item.incubating_at ||
                  props.item.accepted_at === props.item.graduated_at
                    ? '-'
                    : props.item.accepted_at}
                </>
              </Show>
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${styles.statusLegend}`}>Sandbox</small>
          </div>

          <div class="d-flex flex-column align-items-center">
            <div
              class={`badge rounded-0 ${styles.maturityBadge}`}
              classList={{
                [styles.activeMaturityBadge]: ['incubating', 'graduated', 'archived'].includes(props.item.maturity!),
              }}
            >
              {props.item.incubating_at || '-'}
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${styles.statusLegend}`}>Incubating</small>
          </div>

          <div class="d-flex flex-column align-items-center">
            <div
              class={`badge rounded-0 ${styles.maturityBadge}`}
              classList={{
                [styles.activeMaturityBadge]: ['graduated', 'archived'].includes(props.item.maturity!),
              }}
            >
              {props.item.graduated_at || '-'}
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${styles.statusLegend}`}>Graduated</small>
          </div>
        </div>
        <div class={`${styles.line} ${props.item.maturity}Line`} />
      </div>
    </Show>
  );
};

export default MobileMaturitySection;

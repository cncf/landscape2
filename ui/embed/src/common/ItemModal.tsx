import { ItemModalContent, Modal } from 'common';
import { Show, createEffect, createSignal, on } from 'solid-js';
import { BaseItem } from '../types';

interface Props {
  activeItemId: string | null;
  onClose: () => void;
}

const SAMPLE = {
  category: 'App Definition and Development',
  homepage_url: 'https://artifacthub.io',
  id: 'app-definition-and-development--application-definition-image-build--artifact-hub',
  logo: 'logos/07c63442d3e8608cbfe2ef02894d00fc4daf3f66ca4083addb5f62c7ad58cb9e.svg',
  name: 'Artifact Hub',
  subcategory: 'Application Definition & Image Build',
  website: 'https://artifacthub.io',
  accepted_at: '2020-06-25',
  artwork_url: 'https://github.com/cncf/artwork/blob/master/examples/sandbox.md#artifact-hub-logos',
  clomonitor_name: 'artifact-hub',
  clomonitor_report_summary: 'images/clomonitor_cncf_artifact-hub.svg',
  crunchbase_url: 'https://www.crunchbase.com/organization/cloud-native-computing-foundation',
  devstats_url: 'https://artifacthub.devstats.cncf.io/',
  featured: { label: 'CNCF Incubating', order: 2 },
  incubating_at: '2024-05-30',
  maturity: 'incubating',
  latest_annual_review_at: '2021-06-23',
  latest_annual_review_url: 'https://github.com/cncf/toc/pull/681',
  repositories: [{ url: 'https://github.com/artifacthub/hub', primary: true }],
  tag: 'app-delivery',
  twitter_url: 'https://twitter.com/cncfartifacthub',
};

const ItemModal = (props: Props) => {
  const activeItemId = () => props.activeItemId;
  const [itemInfo, setItemInfo] = createSignal<BaseItem | null>(null);

  createEffect(
    on(activeItemId, () => {
      if (activeItemId() !== null) {
        setItemInfo(SAMPLE);
      } else {
        setItemInfo(null);
      }
    })
  );

  return (
    <Show when={itemInfo() !== null}>
      <Modal size="xl" onClose={props.onClose} open>
        <ItemModalContent item={itemInfo()} foundation={'test'} />
      </Modal>
    </Show>
  );
};

export default ItemModal;

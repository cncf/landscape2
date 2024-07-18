import { createEffect, createSignal, on } from 'solid-js';

import { SVGIconKind } from '../types/types';
import { formatShieldsBadgeContent } from '../utils/formatShieldsBadgeContent';
import { CodeBlock } from './CodeBlock';
import { Modal } from './Modal';
import { SVGIcon } from './SVGIcon';
import { Tabs } from './Tabs';

interface Props {
  itemId: string;
  foundation: string;
  basePath: string;
  openStatus: boolean;
  onCloseModal: () => void;
}

export const BadgeModal = (props: Props) => {
  const itemId = () => props.itemId;
  const foundation = () => props.foundation;
  const openStatus = () => props.openStatus;
  const origin = window.location.origin;
  const [badgeImage, setBadgeImage] = createSignal<string>(
    `https://img.shields.io/badge/${formatShieldsBadgeContent(foundation())}%20Landscape-5699C6`
  );
  const markdownLink = () =>
    `[![${foundation()} Landscape](${badgeImage()})](${origin}${props.basePath}/?item=${itemId()})`;
  const asciiLink = () =>
    `${origin}${props.basePath}/?item=${itemId()}[image:${badgeImage()}[${foundation()} LANDSCAPE]]`;

  createEffect(
    on(foundation, () => {
      setBadgeImage(`https://img.shields.io/badge/${formatShieldsBadgeContent(foundation())}%20Landscape-5699C6`);
    })
  );

  return (
    <Modal
      header="Item badge"
      onClose={props.onCloseModal}
      open={openStatus()}
      footer={
        <button
          type="button"
          class="btn btn-sm rounded-0 btn-primary text-uppercase"
          onClick={(e) => {
            e.preventDefault();
            props.onCloseModal();
          }}
          aria-label="Close modal"
        >
          <div class="d-flex flex-row align-items-center">
            <SVGIcon kind={SVGIconKind.Clear} class="me-2" />
            <div>Close</div>
          </div>
        </button>
      }
    >
      <div class="my-3">
        <Tabs
          tabs={[
            {
              name: 'markdown',
              title: 'Markdown',
              content: (
                <>
                  <div class="mt-2 mb-4">
                    <img src={badgeImage()} alt="Landscape badge" />
                  </div>

                  <CodeBlock
                    language="markdown"
                    content={markdownLink()}
                    label="Copy badge markdown link to clipboard"
                    withCopyBtn
                  />
                </>
              ),
            },
            {
              name: 'ascii',
              title: 'AsciiDoc',
              content: (
                <>
                  <div class="mt-2 mb-4">
                    <img src={badgeImage()} alt="Landscape badge" />
                  </div>

                  <CodeBlock
                    language="asciidoc"
                    content={asciiLink()}
                    label="Copy badge Ascii link to clipboard"
                    withCopyBtn
                  />
                </>
              ),
            },
          ]}
          initialActive="markdown"
          noDataContent="Sorry, the information for this is missing."
        />
      </div>
    </Modal>
  );
};

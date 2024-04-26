import { BASE_PATH, FOUNDATION } from '../../../data';
import { SVGIconKind } from '../../../types';
import CodeBlock from '../CodeBlock';
import Modal from '../Modal';
import SVGIcon from '../SVGIcon';
import Tabs from '../Tabs';

interface Props {
  itemId: string;
  openStatus: boolean;
  onCloseModal: () => void;
}

const BadgeModal = (props: Props) => {
  const itemId = () => props.itemId;
  const openStatus = () => props.openStatus;
  const origin = window.location.origin;
  const foundation = FOUNDATION;
  const badgeImage = `https://img.shields.io/badge/${foundation}%20Landscape-5699C6`;
  const markdownLink = () => `[![${foundation} Landscape](${badgeImage})](${origin}${BASE_PATH}/?item=${itemId()})`;
  const asciiLink = () => `${origin}${BASE_PATH}/?item=${itemId()}[image:${badgeImage}[${foundation} LANDSCAPE]]`;

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
                    <img src={badgeImage} alt="Landscape badge" />
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
                    <img src={badgeImage} alt="Landscape badge" />
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

export default BadgeModal;

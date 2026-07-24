import type { Accessor, JSXElement } from 'solid-js';

export enum SVGIconKind {
  CSV = 'csv',
  Download = 'download',
  PDF = 'pdf',
  PNG = 'png',
  ToC = 'toc',
}

export interface Item {
  id: string;
  [key: string]: unknown;
}

interface ChildrenProps {
  children: JSXElement;
}

interface ItemContentProps {
  basePath?: string;
  foundation: string;
  hideOrganizationSection?: boolean;
  item?: unknown;
  onClose?: () => void;
  parentInfo?: unknown;
}

interface ModalProps extends ChildrenProps {
  bodyClass?: string;
  id?: string;
  modalDialogClass?: string;
  onClose: () => void;
  open: boolean;
  size?: string;
  title: string;
}

export const ItemModalContent = (props: ItemContentProps) => {
  void props;
  return createTextElement('Item content');
};
export const ItemModalMobileContent = (props: ItemContentProps) => {
  void props;
  return createTextElement('Mobile item content');
};
export const Loading = (props: { spinnerClass?: string }) => {
  void props;
  return createTextElement('Loading...');
};
export const Modal = (props: ModalProps) => <>{props.children}</>;
export const NoData = (props: ChildrenProps) => <>{props.children}</>;
export const SVGIcon = (props: { class?: string; kind: SVGIconKind }) => {
  void props;
  return document.createElement('span');
};
export const useBreakpointDetect = () => ({ point: (() => undefined) as Accessor<undefined> });
export const useOutsideClick = (...arguments_: unknown[]) => {
  void arguments_;
};

const createTextElement = (text: string) => {
  const element = document.createElement('div');
  element.textContent = text;
  return element;
};

import { createRoot, createSignal } from 'solid-js';

import { useBodyScroll } from '../useBodyScroll';

describe('useBodyScroll', () => {
  let disposeTestRoot: (() => void) | undefined;

  afterEach(() => {
    disposeTestRoot?.();
    document.body.removeAttribute('class');
  });

  it('should keep scrolling locked when another modal instance is closed', async () => {
    const [activeModalOpen, setActiveModalOpen] = createSignal(true);
    const [inactiveModalOpen] = createSignal(false);

    disposeTestRoot = createRoot((disposeRoot) => {
      useBodyScroll(activeModalOpen, 'modal');
      useBodyScroll(inactiveModalOpen, 'modal');
      return disposeRoot;
    });
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(true);

    setActiveModalOpen(false);
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(false);
  });

  it('should keep scrolling locked until the last stacked modal closes', async () => {
    const [childModalOpen, setChildModalOpen] = createSignal(true);
    const [parentModalOpen, setParentModalOpen] = createSignal(true);

    disposeTestRoot = createRoot((disposeRoot) => {
      useBodyScroll(parentModalOpen, 'modal');
      useBodyScroll(childModalOpen, 'modal');
      return disposeRoot;
    });
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(true);

    setChildModalOpen(false);
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(true);

    setParentModalOpen(false);
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(false);
  });

  it('should release an active scroll lock during cleanup', async () => {
    const [modalOpen] = createSignal(true);

    disposeTestRoot = createRoot((disposeRoot) => {
      useBodyScroll(modalOpen, 'modal');
      return disposeRoot;
    });
    await Promise.resolve();

    expect(document.body.classList.contains('noScroll-modal')).toBe(true);

    disposeTestRoot();
    disposeTestRoot = undefined;

    expect(document.body.classList.contains('noScroll-modal')).toBe(false);
  });
});

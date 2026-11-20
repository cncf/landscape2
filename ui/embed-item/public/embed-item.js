/* eslint-disable no-undef */
// Script for the pages hosting embed views with the item details view. It
// shows the embed-item iframe (`#embed-item`) when an embed view on the page
// asks for an item, and hides it when embed-item closes it.
(() => {
  // Only the first copy of the script included in a page handles the messages
  if (window.landscape2EmbedItemHost) return;
  window.landscape2EmbedItemHost = true;

  // Host page `overflow-y` saved while the item details are shown
  let savedOverflowY = null;

  // Checks the source of a message is the window of an iframe on the page
  const isPageIframe = (source) =>
    source !== null &&
    Array.from(document.querySelectorAll('iframe')).some((iframe) => iframe.contentWindow === source);

  const processMessage = (event) => {
    const embedItemIframe = document.getElementById('embed-item');
    if (!embedItemIframe || typeof event.data !== 'object' || event.data === null) return;

    switch (event.data.type) {
      case 'showItemDetails': {
        // Only embed views served from the embed-item origin can show items
        const embedItemOrigin = new URL(embedItemIframe.src, location.href).origin;
        if (event.origin !== embedItemOrigin || !isPageIframe(event.source)) return;

        embedItemIframe.contentWindow.postMessage(event.data, embedItemOrigin);
        embedItemIframe.style.setProperty('display', 'block', 'important');
        if (savedOverflowY === null) savedOverflowY = document.body.style.overflowY;
        document.body.style.setProperty('overflow-y', 'hidden');
        break;
      }
      case 'hideItemDetails':
        // Only embed-item can hide the item details
        if (event.source !== embedItemIframe.contentWindow) return;

        embedItemIframe.style.setProperty('display', 'none', 'important');
        if (savedOverflowY !== null) {
          document.body.style.overflowY = savedOverflowY;
          savedOverflowY = null;
        }
        break;
    }
  };

  // Listen for messages from the iframes
  window.addEventListener('message', processMessage, false);
})();

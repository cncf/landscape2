/* eslint-disable no-undef */
(() => {
  const processMessage = (event) => {
    const embedItemIframe = document.getElementById('embed-item');
    if (embedItemIframe) {
      switch (event.data.type) {
        case 'showItemDetails':
          embedItemIframe.contentWindow.postMessage(event.data, '*');
          embedItemIframe.style.setProperty('display', 'block', 'important');
          document.body.style.setProperty('overflow-y', 'hidden');
          break;
        case 'hideItemDetails':
          embedItemIframe.contentWindow.postMessage(event.data, '*');
          embedItemIframe.style.setProperty('display', 'none', 'important');
          document.body.style.setProperty('overflow-y', 'auto');
          break;
      }
    }
  };
  // Listen for messages from iframes
  window.addEventListener('message', processMessage, false);
})();

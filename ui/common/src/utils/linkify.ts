const urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

export const linkify = (text: string): string => {
  return text.replace(urlRegex, function(url) {
    return `<a href="${url}" class="text-decoration-underline" target=_blank rel="noopener noreferrer">${url}</a>`;
  });
}

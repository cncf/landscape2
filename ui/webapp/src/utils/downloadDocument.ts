interface DownloadDocument {
  doc: string;
  format: string;
}

/** Return the generated file name for a downloadable document. */
export const getDownloadDocumentName = (document: DownloadDocument) => `${document.doc}.${document.format}`;

/** Return the environment-specific URL for a downloadable document. */
export const getDownloadDocumentUrl = (document: DownloadDocument) =>
  import.meta.env.MODE === 'development'
    ? `../../static/docs/${getDownloadDocumentName(document)}`
    : `./docs/${getDownloadDocumentName(document)}`;

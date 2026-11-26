/** Checks whether the browser is Safari (and not a Chromium or Android browser). */
const detectIfSafari = (): boolean => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export default detectIfSafari;

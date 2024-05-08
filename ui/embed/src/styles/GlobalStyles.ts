import { createGlobalStyles, StylesArg } from 'solid-styled-components';

const CustomStyles = {
  body: {
    'overflow-x': 'hidden',
    margin: '0px',
  },
};

const GlobalStyles = createGlobalStyles(CustomStyles as StylesArg);

export default GlobalStyles;

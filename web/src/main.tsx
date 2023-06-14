import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const element = document.getElementById('landscape') as HTMLElement;

ReactDOM.createRoot(element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

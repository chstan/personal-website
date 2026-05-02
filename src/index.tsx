import React from 'react';
import { createRoot } from 'react-dom/client';

import './css/index.css';
import App from './App';

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app root element in index.html');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

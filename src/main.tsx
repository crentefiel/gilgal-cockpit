import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GilgalStateProvider } from './state/GilgalStateProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GilgalStateProvider>
      <App />
    </GilgalStateProvider>
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LocalDemoAdapter } from './adapters/LocalDemoAdapter';
import { GilgalStateProvider } from './state/GilgalStateProvider';
import './styles.css';

const desktopAdapter = window.gilgalDesktop?.isDesktop ? new LocalDemoAdapter() : undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GilgalStateProvider adapter={desktopAdapter}>
      <App />
    </GilgalStateProvider>
  </React.StrictMode>,
);

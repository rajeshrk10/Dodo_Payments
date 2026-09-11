import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoStore from './DemoStore';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoStore />
  </React.StrictMode>
);

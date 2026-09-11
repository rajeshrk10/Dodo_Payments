import React from 'react';
import ReactDOM from 'react-dom/client';
import CheckoutApp from './CheckoutApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('checkout-root')!).render(
  <React.StrictMode>
    <CheckoutApp />
  </React.StrictMode>
);

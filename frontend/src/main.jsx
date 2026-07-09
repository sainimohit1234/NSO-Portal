import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Auto-reload on chunk error (happens after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

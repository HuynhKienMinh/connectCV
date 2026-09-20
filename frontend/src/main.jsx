// [Main] Mount React DOM vào thẻ div#root — điểm khởi chạy ứng dụng React
import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return <h1>ConnectCV Web Dashboard is running!</h1>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "16px",
          background: "#141827",
          color: "#f6f7fb",
        },
      }}
    />
  </React.StrictMode>
);

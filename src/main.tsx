import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./App.css";
import "./themes/oscuro.css";
import "./themes/claro.css";
import "./themes/oceano.css";
import "./themes/bosque.css";
import "./themes/atardecer.css";
import "./themes/contraste.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

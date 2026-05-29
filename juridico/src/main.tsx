import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installInterceptor } from "./lib/apiInterceptor";

installInterceptor();

createRoot(document.getElementById("root")!).render(<App />);

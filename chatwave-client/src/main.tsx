import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "@fontsource-variable/geist";
import "@fontsource-variable/bricolage-grotesque";
import "./index.css";
import App from "./App";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            boxShadow: "var(--shadow-pop)",
            fontSize: "0.875rem",
          },
          success: { iconTheme: { primary: "var(--primary)", secondary: "var(--primary-fg)" } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);

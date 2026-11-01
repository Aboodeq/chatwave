import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "@fontsource-variable/geist";
import "@fontsource-variable/bricolage-grotesque";
// Arabic letters only: downloaded when Arabic text is on screen (Latin stays Geist).
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "./i18n";
import "./index.css";
import App from "./App";
import { FullScreenLoader } from "./components/ui/FullScreenLoader";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* The first render waits for the language file. */}
      <Suspense fallback={<FullScreenLoader />}>
        <App />
      </Suspense>
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

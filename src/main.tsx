import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, type AppDependencies } from "./app/App";
import { dealPuzzle } from "./game/puzzle";
import { I18nProvider } from "./i18n/I18nContext";
import type { ShareDependencies } from "./services/sharing";
import "./styles/global.css";

const dependencies: AppDependencies = {
  random: Math.random,
  nextTileId: () => crypto.randomUUID(),
  gameUrl: window.location.origin + window.location.pathname,
  dealPuzzle: () => dealPuzzle(Math.random),
};

const shareDependencies: ShareDependencies = {
  nativeShare: navigator.share?.bind(navigator),
  writeClipboard: (text) => navigator.clipboard.writeText(text),
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App dependencies={dependencies} shareDependencies={shareDependencies} />
    </I18nProvider>
  </StrictMode>,
);

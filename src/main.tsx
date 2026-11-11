import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, type AppDependencies } from "./app/App";
import { DAILY_TABLES } from "./game/dailyTables";
import { dealPuzzle } from "./game/puzzle";
import { I18nProvider } from "./i18n/I18nContext";
import { createDailyStore } from "./services/dailyStorage";
import type { ShareDependencies } from "./services/sharing";
import "./styles/global.css";

// Reading window.localStorage throws when site data is blocked.
function storageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const dependencies: AppDependencies = {
  nextTileId: () => crypto.randomUUID(),
  gameUrl: window.location.origin + window.location.pathname,
  dealPuzzle: () => dealPuzzle(Math.random),
  now: () => new Date(),
  dailyStore: createDailyStore(storageOrNull()),
  dailyTables: DAILY_TABLES,
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

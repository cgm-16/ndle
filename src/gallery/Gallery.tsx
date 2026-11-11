import { useState } from "react";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TopBar } from "../components/TopBar/TopBar";
import { useI18n } from "../i18n/I18nContext";
import { GALLERY_STATES } from "./states";
import styles from "./Gallery.module.css";

// Skip empty groups entirely rather than rendering an empty heading.
const GROUPS = Object.entries(GALLERY_STATES).filter(([, entries]) => entries.length > 0);
const ALL_ENTRIES = GROUPS.flatMap(([, entries]) => entries);
// The title and the interaction boards are not game screens, so their bar has no Back.
const BARLESS_GROUPS = new Set(["title", "interaction"]);

/** `gallery.html?state=<id>`: the state's bar and screen only, so a fit is measured as the app lays it out. */
function SingleState({ id }: { id: string }) {
  const { t } = useI18n();
  const group = GROUPS.find(([, entries]) => entries.some((entry) => entry.id === id))!;
  const entry = group[1].find((candidate) => candidate.id === id)!;
  const bar = BARLESS_GROUPS.has(group[0]) ? (
    <TopBar />
  ) : (
    <TopBar
      onBack={noop}
      label={entry.dailyNumber === undefined ? t("title.practice") : t("bar.daily", { number: entry.dailyNumber })}
    />
  );

  return (
    <div className={styles.single}>
      {bar}
      {entry.render()}
    </div>
  );
}

function noop() {}

export function Gallery() {
  const requestedId = new URLSearchParams(window.location.search).get("state");
  if (requestedId !== null && ALL_ENTRIES.some((entry) => entry.id === requestedId)) {
    return <SingleState id={requestedId} />;
  }
  return <GalleryPicker />;
}

function GalleryPicker() {
  const [selectedId, setSelectedId] = useState(ALL_ENTRIES[0]?.id);
  const selected = ALL_ENTRIES.find((entry) => entry.id === selectedId);

  return (
    <div className={styles.gallery}>
      <nav className={styles.picker}>
        <LanguageToggle />
        {GROUPS.map(([phase, entries]) => (
          <div key={phase} className={styles.group}>
            <h2 className={styles.groupHeading}>{phase}</h2>
            <ul className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={styles.entryButton}
                    data-state-id={entry.id}
                    aria-pressed={entry.id === selectedId}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {/* Entries that share a root component type (the three gameOver
          entries do) reconcile into one instance without an identity
          key, carrying that component's local state across a switch. */}
      <div key={selected?.id} className={styles.stage}>
        {selected?.render()}
      </div>
    </div>
  );
}

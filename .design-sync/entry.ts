// The design-sync bundle entry: ozterisk is an app, not a published library,
// so this names what Claude Design receives. Every export is the repo's own
// component; the stylesheet is the app's one global sheet (tokens, fonts,
// keyframes, reset), and the components' CSS Modules come with their imports.
import "../src/styles/global.css";

export { I18nProvider } from "../src/i18n/I18nContext";
export { ActionButton } from "../src/components/ActionButton/ActionButton";
export { AnswerSlots } from "../src/components/AnswerSlots/AnswerSlots";
export { EquationBoard } from "../src/components/EquationBoard/EquationBoard";
export { FeedbackPanel } from "../src/components/FeedbackPanel/FeedbackPanel";
export { GameHud } from "../src/components/GameHud/GameHud";
export { GameOverScreen } from "../src/components/GameOverScreen/GameOverScreen";
export { GameScreen } from "../src/components/GameScreen/GameScreen";
export { LanguageToggle } from "../src/components/LanguageToggle/LanguageToggle";
export { OverflowControls } from "../src/components/OverflowControls/OverflowControls";
export { Tile } from "../src/components/Tile/Tile";
export { TileInventory } from "../src/components/TileInventory/TileInventory";
export { TitleScreen } from "../src/components/TitleScreen/TitleScreen";

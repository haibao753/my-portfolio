import { initPreferences } from "./site/preferences";
import { initMenu } from "./site/menu";
import { initClipboard } from "./site/clipboard";
import { initNavigationLight } from "./site/navigation-light";

/** The layout owns markup; each browser behavior has one explicit entry point. */
export function initSiteShell() {
  initPreferences();
  initMenu();
  initClipboard();
  initNavigationLight();
}

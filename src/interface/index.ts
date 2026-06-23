import shell from "./shell.html";
import popups from "./popups/markup.html";
import popupScript from "./popups/script.browser.js";
import popupStyles from "./popups/styles.css";
import script from "./main-script.browser.js";
import styles from "./styles.css";
import updateScript from "./update-check.browser.js";

const assembledScript = script
  .replace("__REPEAT_IT_POPUP_SCRIPT__", popupScript)
  .replace("__REPEAT_IT_UPDATE_SCRIPT__", updateScript);
const assembledStyles = styles.replace("__REPEAT_IT_POPUP_STYLES__", popupStyles);

const repeatItInterface = shell
  .replace("__REPEAT_IT_SCRIPT__", assembledScript)
  .replace("__REPEAT_IT_STYLES__", assembledStyles)
  .replace("__REPEAT_IT_POPUPS__", popups);

export default repeatItInterface;

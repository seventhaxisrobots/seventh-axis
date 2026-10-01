import { initSite } from "../site/site.ts";
import "../styles/home.css";
import "../styles/intro.css";
import "../styles/cobot.css";
import { initCobot } from "./cobot.ts";
import { initFilm } from "./film.ts";

initSite();
initFilm();
initCobot();

// Let people skip the intro.
const intro = document.querySelector<HTMLElement>("[data-intro]");
if (intro) {
  const skip = () => intro.remove();
  intro.addEventListener("click", skip);
  document.addEventListener("keydown", (e) => e.key === "Escape" && skip(), { once: true });
}

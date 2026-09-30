import { initSite } from "../site/site.ts";
import "../styles/home.css";
import "../styles/intro.css";
import { initFilm } from "./film.ts";

initSite();
initFilm();

// Let people skip the intro.
const intro = document.querySelector<HTMLElement>("[data-intro]");
if (intro) {
  const skip = () => intro.remove();
  intro.addEventListener("click", skip);
  document.addEventListener("keydown", (e) => e.key === "Escape" && skip(), { once: true });
}

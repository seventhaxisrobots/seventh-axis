import { initSite } from "../site/site.ts";
import "../styles/home.css";
import "../styles/intro.css";
import "../styles/cobot.css";
import { initCobot } from "./cobot.ts";
import { initFilm } from "./film.ts";
import { initConsole } from "./console.ts";

initSite();
initFilm();
initCobot();
initConsole();

// The opening (logo, then Kuala Lumpur): click, Escape or Skip ends it early.
const intro = document.querySelector<HTMLElement>("[data-intro]");
if (intro && !document.documentElement.classList.contains("intro-seen")) {
  const done = () => {
    document.documentElement.classList.add("intro-seen");
    intro.remove();
  };
  const leave = () => {
    intro.classList.add("is-leaving");
    setTimeout(done, 700);
  };
  intro.addEventListener("animationend", (e) => e.animationName === "intro-lift" && done());
  intro.addEventListener("click", leave, { once: true });
  document.addEventListener("keydown", (e) => e.key === "Escape" && leave(), { once: true });
}

import "../styles/media.css";

// Muted Studio clips play while they're on screen and pause when they leave it.
// Nothing downloads until a clip is near the viewport, and visitors who prefer
// reduced motion get the poster with normal controls instead of autoplay.
export function initMedia(): void {
  const videos = [...document.querySelectorAll<HTMLVideoElement>("video[data-clip]")];
  if (videos.length === 0) return;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const load = (video: HTMLVideoElement) => {
    if (video.src) return;
    video.src = video.dataset.clip!;
    video.load();
  };

  if (still || !("IntersectionObserver" in window)) {
    for (const video of videos) {
      // A hero's background clip stays on its still frame.
      if (still && video.hasAttribute("data-bg")) continue;
      video.controls = true;
      video.preload = "none";
      video.addEventListener("play", () => load(video), { once: true });
      if (!still) load(video);
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        const video = target as HTMLVideoElement;
        if (isIntersecting) {
          load(video);
          void video.play().catch(() => {
            if (!video.hasAttribute("data-bg")) video.controls = true;
          });
        } else {
          video.pause();
        }
      }
    },
    { rootMargin: "200px 0px", threshold: 0.2 },
  );
  for (const video of videos) {
    video.muted = true;
    observer.observe(video);
  }
}

(() => {
  "use strict";

  const header = document.querySelector("[data-site-header]");
  const getScrollY = () => Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);

  let lastScrollY = getScrollY();
  let lastDirection = null;
  let directionDistance = 0;
  let ticking = false;

  const updateHeader = () => {
    if (!header) return;

    const currentY = getScrollY();
    const delta = currentY - lastScrollY;

    if (currentY <= 8) {
      header.classList.remove("is-hidden", "is-scrolled");
      lastDirection = null;
      directionDistance = 0;
    } else {
      header.classList.add("is-scrolled");

      if (Math.abs(delta) > 1) {
        const direction = delta > 0 ? "down" : "up";

        if (direction !== lastDirection) {
          lastDirection = direction;
          directionDistance = 0;
        }

        directionDistance += Math.abs(delta);

        if (direction === "down" && currentY > header.offsetHeight && directionDistance >= 10) {
          header.classList.add("is-hidden");
          directionDistance = 0;
        }

        if (direction === "up" && directionDistance >= 6) {
          header.classList.remove("is-hidden");
          directionDistance = 0;
        }
      }
    }

    lastScrollY = currentY;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener("pageshow", updateHeader);
  updateHeader();

  document.querySelectorAll("[data-scroll-region]").forEach((region) => {
    const track = region.querySelector("[data-scroll-track]");
    const prev = region.querySelector("[data-rail-prev]") || region.parentElement?.querySelector("[data-rail-prev]");
    const next = region.querySelector("[data-rail-next]") || region.parentElement?.querySelector("[data-rail-next]");
    const controls = region.closest("section")?.querySelector("[data-rail-controls]");

    if (!track) return;

    const getStep = () => Math.max(180, Math.round(track.clientWidth * 0.82));

    const updateButtons = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const hasOverflow = maxScroll > 4;
      const atStart = track.scrollLeft <= 4;
      const atEnd = track.scrollLeft >= maxScroll - 4;

      region.classList.toggle("has-overflow", hasOverflow);
      controls?.classList.toggle("is-hidden", !hasOverflow);

      if (prev) {
        prev.disabled = !hasOverflow || atStart;
        prev.setAttribute("aria-disabled", String(prev.disabled));
      }
      if (next) {
        next.disabled = !hasOverflow || atEnd;
        next.setAttribute("aria-disabled", String(next.disabled));
      }
    };

    prev?.addEventListener("click", () => {
      track.scrollBy({ left: -getStep(), behavior: "smooth" });
    });

    next?.addEventListener("click", () => {
      track.scrollBy({ left: getStep(), behavior: "smooth" });
    });

    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons, { passive: true });
    requestAnimationFrame(updateButtons);
  });
})();

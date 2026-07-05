// Ждем, пока вся страница загрузится
document.addEventListener("DOMContentLoaded", function () {
  // 1. Код для меню (который у тебя уже был)
  const menuToggle = document.querySelector(".menu-toggle");
  const menuLinks = document.querySelector(".menu-links");

  if (menuToggle && menuLinks) {
    menuToggle.addEventListener("click", function () {
      menuLinks.classList.toggle("menu-open");
    });
  }

  // 2. НОВЫЙ КОД для "умной" шапки
  const header = document.querySelector(".site-header");
  let lastScrollY = window.scrollY; // Позиция последней прокрутки

  if (header) {
    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        // Скроллим ВНИЗ: Прячем шапку (после 150px)
        header.classList.add("site-header--hidden");
      } else {
        // Скроллим ВВЕРХ: Показываем шапку
        header.classList.remove("site-header--hidden");
      }

      // Обновляем последнюю позицию
      lastScrollY = currentScrollY;
    });
  }
});

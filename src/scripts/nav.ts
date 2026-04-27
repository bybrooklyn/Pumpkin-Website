const burgerButton = document.querySelector<HTMLButtonElement>(".burger-btn");
const header = document.querySelector<HTMLElement>("header");

if (burgerButton && header) {
  burgerButton.addEventListener("click", () => {
    const expanded = burgerButton.getAttribute("aria-expanded") === "true";
    header.classList.toggle("nav-open");
    burgerButton.setAttribute("aria-expanded", String(!expanded));

    const icon = burgerButton.querySelector<HTMLElement>("i");
    if (icon) {
      icon.className = expanded ? "fa-solid fa-bars" : "fa-solid fa-xmark";
    }
  });
}

export {};

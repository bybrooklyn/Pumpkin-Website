document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const language = button.getAttribute("data-lang");
    if (!language) return;

    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");

    document.querySelectorAll<HTMLElement>(".guide-content").forEach((content) => {
      content.classList.remove("active");
    });

    document.getElementById(`${language}-guide`)?.classList.add("active");
  });
});

export {};

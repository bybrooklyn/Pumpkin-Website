const comparisonBars = document.querySelectorAll<HTMLElement>(".comp-bars");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 },
  );

  comparisonBars.forEach((element) => observer.observe(element));
} else {
  comparisonBars.forEach((element) => element.classList.add("animate"));
}

export {};

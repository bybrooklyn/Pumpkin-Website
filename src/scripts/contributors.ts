interface CachedValue<T> {
  ts: number;
  data: T;
}

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

const githubRepo = "Pumpkin-MC/Pumpkin";
const colors = ["orange", "blue", "green", "purple", "pink", "yellow"];
const mobileBreakpoint = 768;
const contributorsPerPage = 10;
const cacheKey = "pumpkin_contributors";
const cacheTtl = 60 * 60 * 1000;

let allContributorsData: Contributor[] = [];
let visibleCount = contributorsPerPage;

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedValue<T>;
    if (Date.now() - cached.ts > cacheTtl) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // storage full or unavailable
  }
}

function countUp(element: HTMLElement, target: number, _unusedDuration?: number): void {
  const duration = 3000;
  const startTime = performance.now();
  const finalValue = target.toLocaleString();

  element.style.minWidth = `${finalValue.length}ch`;

  function update(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const current = Math.floor(target * progress);
    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = finalValue;
    }
  }

  requestAnimationFrame(update);
}

async function fetchContributors(): Promise<void> {
  const grid = document.getElementById("contributors-grid");
  const totalContributorsElement = document.getElementById("total-contributors");
  const totalCommitsElement = document.getElementById("total-commits");

  if (!grid || !totalContributorsElement || !totalCommitsElement) return;

  totalContributorsElement.textContent = "0";
  totalCommitsElement.textContent = "0";

  try {
    let allContributors = getCached<Contributor[]>(cacheKey);

    if (!allContributors) {
      allContributors = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `https://api.github.com/repos/${githubRepo}/contributors?per_page=100&page=${page}`,
        );

        if (response.status === 403) {
          const resetHeader = response.headers.get("X-RateLimit-Reset");
          const resetTime = resetHeader
            ? new Date(Number(resetHeader) * 1000).toLocaleTimeString()
            : "soon";
          throw new Error("RATE_LIMIT:" + resetTime);
        }

        if (!response.ok) throw new Error("Failed to fetch contributors");

        const contributors = (await response.json()) as Contributor[];
        if (contributors.length === 0) {
          hasMore = false;
        } else {
          allContributors = allContributors.concat(contributors);
          page++;
        }
      }

      allContributors = allContributors.filter((contributor) => contributor.type !== "Bot");
      setCache(cacheKey, allContributors);
    }

    const totalCommits = allContributors.reduce((sum, contributor) => sum + contributor.contributions, 0);

    countUp(totalContributorsElement, allContributors.length, 1200);
    countUp(totalCommitsElement, totalCommits, 1800);

    allContributorsData = allContributors;
    renderContributors();
  } catch (error) {
    grid.innerHTML = "";

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-state";

    const errorIcon = document.createElement("i");
    errorIcon.className = "fa-solid fa-exclamation-triangle";

    const errorText = document.createElement("span");
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.startsWith("RATE_LIMIT:")) {
      const resetTime = errorMessage.split(":")[1];
      errorText.textContent =
        "GitHub API rate limit reached. Resets at " + resetTime + ". Please try again later.";
    } else {
      errorText.textContent = "Failed to load contributors. Please try again later.";
    }

    const errorLink = document.createElement("a");
    errorLink.href = "https://github.com/Pumpkin-MC/Pumpkin/graphs/contributors";
    errorLink.className = "btn btn-secondary";
    errorLink.style.marginTop = "1rem";
    errorLink.textContent = "View on GitHub";

    errorDiv.appendChild(errorIcon);
    errorDiv.appendChild(errorText);
    errorDiv.appendChild(errorLink);
    grid.appendChild(errorDiv);
  }
}

function isMobile(): boolean {
  return window.innerWidth <= mobileBreakpoint;
}

function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com";
  } catch {
    return false;
  }
}

function isValidAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "avatars.githubusercontent.com";
  } catch {
    return false;
  }
}

function createContributorCard(contributor: Contributor, index: number): HTMLAnchorElement {
  const color = colors[index % colors.length];

  const link = document.createElement("a");
  link.href = isValidGitHubUrl(contributor.html_url) ? contributor.html_url : "#";
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "contributor-card color-" + color;

  const image = document.createElement("img");
  if (isValidAvatarUrl(contributor.avatar_url)) {
    image.src = contributor.avatar_url;
  }
  image.alt = String(contributor.login).replace(/[^a-zA-Z0-9_-]/g, "");
  image.className = "contributor-avatar";

  const info = document.createElement("div");
  info.className = "contributor-info";

  const name = document.createElement("span");
  name.className = "contributor-name";
  name.textContent = contributor.login;

  const commits = document.createElement("span");
  commits.className = "contributor-commits";
  commits.textContent = Number(contributor.contributions) + " commits";

  const icon = document.createElement("i");
  icon.className = "fa-brands fa-github contributor-link";

  info.appendChild(name);
  info.appendChild(commits);
  link.appendChild(image);
  link.appendChild(info);
  link.appendChild(icon);

  return link;
}

function renderContributors(): void {
  const grid = document.getElementById("contributors-grid");
  const showMoreButton = document.getElementById("show-more-btn") as HTMLButtonElement | null;

  if (!grid || !showMoreButton) return;

  const contributorsToShow = isMobile()
    ? allContributorsData.slice(0, visibleCount)
    : allContributorsData;

  grid.innerHTML = "";
  contributorsToShow.forEach((contributor, index) => {
    grid.appendChild(createContributorCard(contributor, index));
  });

  if (isMobile() && visibleCount < allContributorsData.length) {
    showMoreButton.style.display = "flex";
    const remaining = allContributorsData.length - visibleCount;
    showMoreButton.textContent = "Show More (" + remaining + " remaining) ";

    const chevron = document.createElement("i");
    chevron.className = "fa-solid fa-chevron-down";
    showMoreButton.appendChild(chevron);
  } else {
    showMoreButton.style.display = "none";
  }
}

function showMore(): void {
  visibleCount += contributorsPerPage;
  renderContributors();
}

document.getElementById("show-more-btn")?.addEventListener("click", showMore);

window.addEventListener("resize", () => {
  if (allContributorsData.length > 0) {
    renderContributors();
  }
});

void fetchContributors();

document.querySelectorAll<HTMLButtonElement>(".sponsor-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;

    document.querySelectorAll<HTMLButtonElement>(".sponsor-tab").forEach((item) => {
      item.classList.remove("active");
    });
    tab.classList.add("active");

    const currentWrapper = document.getElementById("sponsors-current-wrapper");
    const pastSection = document.getElementById("sponsors-past");

    if (!currentWrapper || !pastSection) return;

    if (targetTab === "current") {
      currentWrapper.classList.remove("hidden");
      pastSection.classList.add("hidden");
    } else {
      currentWrapper.classList.add("hidden");
      pastSection.classList.remove("hidden");
    }
  });
});

export {};

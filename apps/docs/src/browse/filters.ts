type Sort = "newest" | "updated" | "name";

interface FilterState {
  query: string;
  category: string;
  sort: Sort;
}

const SORTS: readonly Sort[] = ["newest", "updated", "name"];

function readState(categories: readonly string[]): FilterState {
  const params = new URLSearchParams(location.search);
  const category = params.get("category") ?? "all";
  const sort = params.get("sort") as Sort | null;
  return {
    query: params.get("q") ?? "",
    category: categories.includes(category) ? category : "all",
    sort: sort && SORTS.includes(sort) ? sort : "newest",
  };
}

function writeState(state: FilterState): void {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category !== "all") params.set("category", state.category);
  if (state.sort !== "newest") params.set("sort", state.sort);
  const search = params.toString();
  history.replaceState(null, "", `${location.pathname}${search ? `?${search}` : ""}`);
}

function matches(element: HTMLElement, state: FilterState): boolean {
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = element.dataset.search ?? "";
  const inCategory = state.category === "all" || element.dataset.category === state.category;
  return inCategory && words.every((word) => text.includes(word));
}

function compare(sort: Sort): (a: HTMLElement, b: HTMLElement) => number {
  const byName = (a: HTMLElement, b: HTMLElement) => (a.dataset.name ?? "").localeCompare(b.dataset.name ?? "");
  if (sort === "name") return byName;
  const field = sort === "newest" ? "added" : "updated";
  return (a, b) => (b.dataset[field] ?? "").localeCompare(a.dataset[field] ?? "") || byName(a, b);
}

export function initBrowse(root: HTMLElement): void {
  const grid = root.querySelector<HTMLElement>("[data-browse-grid]")!;
  const cards = [...grid.querySelectorAll<HTMLElement>("[data-showcase]")];
  const listItems = [...root.querySelectorAll<HTMLElement>("[data-browse-item]")];
  const listGroups = [...root.querySelectorAll<HTMLElement>("[data-browse-group]")];
  const inputs = [...root.querySelectorAll<HTMLInputElement>("[data-browse-query]")];
  const categoryButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-browse-category-option]")];
  const categorySelect = root.querySelector<HTMLSelectElement>("[data-browse-category]")!;
  const sortSelect = root.querySelector<HTMLSelectElement>("[data-browse-sort]")!;
  const count = root.querySelector<HTMLElement>("[data-browse-count]")!;
  const empty = root.querySelector<HTMLElement>("[data-browse-empty]")!;
  const clear = root.querySelector<HTMLButtonElement>("[data-browse-clear]")!;
  const categories = [...categorySelect.options].map((option) => option.value);
  const state = readState(categories);

  const render = (): void => {
    let shown = 0;
    for (const card of [...cards].sort(compare(state.sort))) {
      card.hidden = !matches(card, state);
      if (!card.hidden) shown += 1;
      grid.append(card);
    }
    for (const item of listItems) item.hidden = !matches(item, { ...state, category: "all" });
    for (const group of listGroups) group.hidden = !group.querySelector("[data-browse-item]:not([hidden])");
    for (const button of categoryButtons) button.setAttribute("aria-pressed", String(button.dataset.browseCategoryOption === state.category));
    for (const input of inputs) if (input.value !== state.query) input.value = state.query;
    categorySelect.value = state.category;
    sortSelect.value = state.sort;
    count.textContent = `${shown} ${shown === 1 ? "component" : "components"}`;
    empty.hidden = shown > 0;
    writeState(state);
  };

  for (const input of inputs) {
    input.addEventListener("input", () => {
      state.query = input.value;
      render();
    });
  }
  for (const button of categoryButtons) {
    button.addEventListener("click", () => {
      state.category = button.dataset.browseCategoryOption ?? "all";
      render();
    });
  }
  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    render();
  });
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value as Sort;
    render();
  });
  clear.addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    render();
  });
  render();
}

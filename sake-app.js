const state = {
  sakes: [],
  filter: "all",
  search: "",
};

const tohokuPrefs = new Set(["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]);

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalize = (value) => String(value ?? "").toLowerCase();

const matchesFilter = (sake) => {
  if (state.filter === "high-rating") return Number(sake.rating || 0) >= 5;
  if (state.filter === "junmai-ginjo") return String(sake.type || "").includes("純米吟醸");
  if (state.filter === "tohoku") return tohokuPrefs.has(sake.prefecture || "");
  if (state.filter === "has-comment") return Boolean(String(sake.comment || "").trim());
  return true;
};

const matchesSearch = (sake) => {
  const query = normalize(state.search).trim();
  if (!query) return true;
  const haystack = normalize([
    sake.name,
    sake.reading,
    sake.ratingText,
    sake.type,
    sake.brewery,
    sake.prefecture,
    sake.drankDate,
    sake.comment,
  ].join(" "));
  return haystack.includes(query);
};

const visibleSakes = () => state.sakes.filter((sake) => matchesFilter(sake) && matchesSearch(sake));

const renderImage = (sake) => {
  const images = Array.isArray(sake.images) && sake.images.length ? sake.images : [sake.image].filter(Boolean);
  const firstImage = images[0] || "";
  const thumbnails = images.length > 1
    ? `<div class="thumbnail-strip" aria-label="${escapeHtml(sake.name)}の写真一覧">
        ${images.map((image, index) => `
          <button class="thumb-button${index === 0 ? " is-active" : ""}" type="button" data-image="${escapeHtml(image)}" aria-label="写真${index + 1}を表示">
            <img src="${escapeHtml(image)}" alt="" loading="lazy" />
          </button>
        `).join("")}
      </div>`
    : "";

  return `
    <figure class="photo-frame${firstImage ? "" : " is-missing"}">
      ${firstImage ? `<img class="sake-photo" src="${escapeHtml(firstImage)}" alt="${escapeHtml(sake.name)}" loading="lazy" />` : ""}
      ${images.length > 1 ? `<figcaption class="photo-count">${images.length} photos</figcaption>` : ""}
      ${thumbnails}
    </figure>
  `;
};

const renderCards = (sakes) => {
  const grid = document.getElementById("sakeGrid");
  if (!grid) return;

  if (!sakes.length) {
    grid.innerHTML = `<div class="empty-state">条件に一致する日本酒がありません。</div>`;
    return;
  }

  grid.innerHTML = sakes.map((sake) => `
    <article class="sake-card" data-id="${escapeHtml(sake.id)}">
      ${renderImage(sake)}
      <div class="card-body">
        <div class="card-topline">
          <span class="type-tag">${escapeHtml(sake.type || "不明")}</span>
          <span class="stars">${escapeHtml(sake.ratingText || "未評価")}</span>
        </div>
        <h3>${escapeHtml(sake.name || "名称未設定")}</h3>
        ${sake.reading ? `<p class="sake-reading">読み方: ${escapeHtml(sake.reading)}</p>` : ""}
        <dl>
          <div><dt>酒造店</dt><dd>${escapeHtml(sake.brewery || "不明")}</dd></div>
          <div><dt>県名</dt><dd>${escapeHtml(sake.prefecture || "不明")}</dd></div>
          <div><dt>飲んだ日</dt><dd>${escapeHtml(sake.drankDate || "未設定")}</dd></div>
        </dl>
        <p>${escapeHtml(sake.comment || "コメント未設定")}</p>
      </div>
    </article>
  `).join("");

  bindImageFallbacks();
  bindThumbnails();
};

const renderTable = (sakes) => {
  const tableBody = document.getElementById("sakeTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = sakes.map((sake) => `
    <div class="table-row" role="row">
      <span role="cell">${escapeHtml(sake.name || "名称未設定")}</span>
      <span role="cell">${escapeHtml(sake.reading || "-")}</span>
      <span role="cell">${escapeHtml(sake.ratingText || "未評価")}</span>
      <span role="cell">${escapeHtml(sake.type || "不明")}</span>
      <span role="cell">${escapeHtml(sake.brewery || "不明")}</span>
      <span role="cell">${escapeHtml(sake.prefecture || "不明")}</span>
      <span role="cell">${escapeHtml(sake.drankDate || "未設定")}</span>
    </div>
  `).join("");
};

const renderStats = () => {
  const total = state.sakes.length;
  const prefectures = new Set(state.sakes.map((sake) => sake.prefecture).filter(Boolean));
  const breweries = new Set(state.sakes.map((sake) => sake.brewery).filter(Boolean));
  const rated = state.sakes.map((sake) => Number(sake.rating || 0)).filter((rating) => rating > 0);
  const average = rated.length ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length : 0;

  document.getElementById("totalBottles").textContent = total;
  document.getElementById("prefectureCount").textContent = prefectures.size;
  document.getElementById("breweryCount").textContent = breweries.size;
  document.getElementById("averageRating").textContent = average.toFixed(1);
};

const bindImageFallbacks = () => {
  document.querySelectorAll(".sake-photo, .thumb-button img").forEach((img) => {
    img.addEventListener("error", () => {
      const frame = img.closest(".photo-frame");
      if (frame) frame.classList.add("is-missing");
      img.remove();
    }, { once: true });
  });
};

const bindThumbnails = () => {
  document.querySelectorAll(".thumb-button").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = button.closest(".photo-frame");
      const main = frame?.querySelector(".sake-photo");
      const nextImage = button.dataset.image;
      if (!main || !nextImage) return;
      main.src = nextImage;
      frame.querySelectorAll(".thumb-button").forEach((thumb) => thumb.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });
};

const render = () => {
  const sakes = visibleSakes();
  renderCards(sakes);
  renderTable(sakes);
  const visibleCount = document.getElementById("visibleCount");
  if (visibleCount) visibleCount.textContent = `${sakes.length}本表示`;
};

const bindFilters = () => {
  document.querySelectorAll(".chip[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      document.querySelectorAll(".chip[data-filter]").forEach((chip) => chip.classList.remove("is-selected"));
      button.classList.add("is-selected");
      render();
    });
  });

  const search = document.getElementById("sakeSearch");
  if (search) {
    search.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });
  }
};

fetch("sake-data.json?v=20260816-reading-v2")
  .then((response) => {
    if (!response.ok) throw new Error(`sake-data.jsonを読み込めませんでした: ${response.status}`);
    return response.json();
  })
  .then((sakes) => {
    state.sakes = Array.isArray(sakes) ? sakes : [];
    renderStats();
    bindFilters();
    render();
  })
  .catch((error) => {
    console.error(error);
    const grid = document.getElementById("sakeGrid");
    if (grid) grid.innerHTML = `<div class="empty-state">データを読み込めませんでした。</div>`;
  });

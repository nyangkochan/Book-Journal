const config = window.BIANCA_CONFIG || {};
const configReady =
  config.supabaseUrl &&
  config.supabasePublishableKey &&
  !config.supabaseUrl.includes("PASTE_") &&
  !config.supabasePublishableKey.includes("PASTE_");

const client = configReady
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
  : null;

let allBooks = [];

const bookGrid = document.getElementById("bookGrid");
const emptyState = document.getElementById("emptyState");
const genreFilter = document.getElementById("genreFilter");
const ratingFilter = document.getElementById("ratingFilter");
const searchInput = document.getElementById("searchInput");
const dialog = document.getElementById("bookDialog");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function coverMarkup(book, className = "") {
  if (book.cover_url) {
    return `<img src="${escapeHtml(book.cover_url)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy">`;
  }
  return `<div class="cover-placeholder ${className}">${escapeHtml(book.title)}</div>`;
}

function stars(rating = 0) {
  const full = Math.round(Number(rating));
  return `${"●".repeat(full)}${"○".repeat(Math.max(0, 5 - full))}`;
}

function prettyDate(value) {
  if (!value) return "date unrecorded";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

async function loadBooks() {
  if (!client) {
    document.getElementById("loadingScreen").classList.add("hidden");
    bookGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>Connect Supabase first.</h3>
        <p>Open <b>config.js</b> and paste your Project URL and publishable key.</p>
      </div>`;
    return;
  }

  const { data, error } = await client
    .from("books")
    .select("*")
    .eq("published", true)
    .order("finished_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  document.getElementById("loadingScreen").classList.add("hidden");

  if (error) {
    bookGrid.innerHTML = `<p>Could not open the shelves yet: ${escapeHtml(error.message)}</p>`;
    return;
  }

  allBooks = data || [];
  buildGenres();
  updateStats();
  renderFeatured();
  renderBooks();
}

function buildGenres() {
  const genres = [...new Set(allBooks.map(book => book.genre).filter(Boolean))].sort();
  genreFilter.innerHTML =
    `<option value="all">All genres</option>` +
    genres.map(genre => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join("");
}

function updateStats() {
  const pages = allBooks.reduce((sum, book) => sum + Number(book.pages || 0), 0);
  const average = allBooks.length
    ? allBooks.reduce((sum, book) => sum + Number(book.rating || 0), 0) / allBooks.length
    : 0;

  document.getElementById("statBooks").textContent = allBooks.length;
  document.getElementById("statPages").textContent = pages.toLocaleString("en");
  document.getElementById("statRating").textContent = allBooks.length ? average.toFixed(1) : "—";
}

function renderFeatured() {
  if (!allBooks.length) return;
  const book = allBooks.find(item => item.favorite) || allBooks[0];
  document.getElementById("featuredBook").innerHTML = `
    <div class="featured-layout">
      <div class="featured-cover">${coverMarkup(book)}</div>
      <div class="featured-copy">
        <span class="eyebrow">CURRENTLY PINNED</span>
        <h2>${escapeHtml(book.title)}</h2>
        <p class="author">${escapeHtml(book.author)}</p>
        <p class="verdict">${escapeHtml(book.verdict || book.review.slice(0, 145))}</p>
        <button class="read-review" data-open-book="${book.id}">Open reading note</button>
      </div>
      <div class="rating-stamp">${Number(book.rating).toFixed(1)}<small>BIANCA'S RATING</small></div>
      <div class="featured-meta">
        <span>${escapeHtml(book.genre || "Unsorted")}</span>
        <span>${prettyDate(book.finished_date)}</span>
        ${book.pages ? `<span>${Number(book.pages).toLocaleString()} pages</span>` : ""}
      </div>
    </div>`;
}

function renderBooks() {
  const query = searchInput.value.trim().toLowerCase();
  const genre = genreFilter.value;
  const minimumRating = ratingFilter.value === "all" ? 0 : Number(ratingFilter.value);

  const filtered = allBooks.filter(book => {
    const searchable = `${book.title} ${book.author}`.toLowerCase();
    return searchable.includes(query) &&
      (genre === "all" || book.genre === genre) &&
      Number(book.rating) >= minimumRating;
  });

  bookGrid.innerHTML = filtered.map(book => `
    <article class="book-card" tabindex="0" role="button" data-open-book="${book.id}" aria-label="Read review of ${escapeHtml(book.title)}">
      <div class="book-cover">${coverMarkup(book)}</div>
      <h3>${escapeHtml(book.title)}</h3>
      <p class="card-author">${escapeHtml(book.author)}</p>
      <div class="card-rating">${stars(book.rating)} · ${Number(book.rating).toFixed(1)}</div>
    </article>`).join("");

  emptyState.hidden = filtered.length > 0;
}

function openBook(id) {
  const book = allBooks.find(item => String(item.id) === String(id));
  if (!book) return;

  document.getElementById("dialogContent").innerHTML = `
    <div class="dialog-layout">
      <div class="book-cover">${coverMarkup(book)}</div>
      <div class="dialog-copy">
        <span class="eyebrow">READING NOTE / ${prettyDate(book.finished_date).toUpperCase()}</span>
        <h2>${escapeHtml(book.title)}</h2>
        <p class="author">by ${escapeHtml(book.author)}</p>
        <div class="dialog-tags">
          <span>${Number(book.rating).toFixed(1)} / 5</span>
          ${book.genre ? `<span>${escapeHtml(book.genre)}</span>` : ""}
          ${book.mood ? `<span>mood: ${escapeHtml(book.mood)}</span>` : ""}
          ${book.pages ? `<span>${Number(book.pages)} pages</span>` : ""}
        </div>
        ${book.quote ? `<blockquote class="dialog-quote">“${escapeHtml(book.quote)}”</blockquote>` : ""}
        <p class="review">${escapeHtml(book.review)}</p>
      </div>
    </div>`;
  dialog.showModal();
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-open-book]");
  if (trigger) openBook(trigger.dataset.openBook);
});

document.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".book-card")) {
    event.preventDefault();
    openBook(event.target.dataset.openBook);
  }
});

document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
[searchInput, genreFilter, ratingFilter].forEach(element => {
  element.addEventListener("input", renderBooks);
  element.addEventListener("change", renderBooks);
});

loadBooks();

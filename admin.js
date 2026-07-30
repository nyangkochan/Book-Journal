const config = window.BIANCA_CONFIG || {};
const configReady =
  config.supabaseUrl &&
  config.supabasePublishableKey &&
  !config.supabaseUrl.includes("PASTE_") &&
  !config.supabasePublishableKey.includes("PASTE_");

const client = configReady
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
  : null;

let adminBooks = [];
let toastTimer;

const loginView = document.getElementById("loginView");
const editorView = document.getElementById("editorView");
const bookForm = document.getElementById("bookForm");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setMessage(id, message, isError = false) {
  const element = document.getElementById(id);
  element.textContent = message;
  element.style.color = isError ? "#965f60" : "#66705a";
}

async function checkSession() {
  if (!client) {
    setMessage("loginMessage", "Isi config.js terlebih dahulu.", true);
    return;
  }
  const { data } = await client.auth.getSession();
  toggleViews(Boolean(data.session));
  if (data.session) loadAdminBooks();
}

function toggleViews(signedIn) {
  loginView.hidden = signedIn;
  editorView.hidden = !signedIn;
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!client) return setMessage("loginMessage", "Isi config.js terlebih dahulu.", true);

  setMessage("loginMessage", "Checking your key to the reading room…");
  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value
  });

  if (error) return setMessage("loginMessage", error.message, true);
  toggleViews(true);
  setMessage("loginMessage", "");
  loadAdminBooks();
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await client.auth.signOut();
  toggleViews(false);
  showToast("Signed out.");
});

async function loadAdminBooks() {
  const { data, error } = await client
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("adminBookList").innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }

  adminBooks = data || [];
  document.getElementById("adminBookList").innerHTML = adminBooks.length
    ? adminBooks.map(book => `
      <article class="admin-book">
        ${book.cover_url
          ? `<img class="admin-thumb" src="${escapeHtml(book.cover_url)}" alt="">`
          : `<div class="admin-thumb"></div>`}
        <div>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${Number(book.rating).toFixed(1)} · ${book.published ? "published" : "draft"}</p>
        </div>
        <div class="admin-entry-actions">
          <button type="button" data-edit="${book.id}" aria-label="Edit ${escapeHtml(book.title)}">✎</button>
          <button type="button" data-delete="${book.id}" aria-label="Delete ${escapeHtml(book.title)}">×</button>
        </div>
      </article>`).join("")
    : "<p>No entries yet. Your first shelf is waiting.</p>";
}

async function uploadCover(file) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error("Cover maksimal 5 MB.");

  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from("book-covers")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data } = client.storage.from("book-covers").getPublicUrl(fileName);
  return { url: data.publicUrl, path: fileName };
}

bookForm.addEventListener("submit", async event => {
  event.preventDefault();

  const saveButton = document.getElementById("saveButton");
  saveButton.disabled = true;
  saveButton.textContent = "saving to the shelves…";
  setMessage("formMessage", "");

  try {
    const file = document.getElementById("coverFile").files[0];
    const uploadedCover = await uploadCover(file);
    const id = document.getElementById("bookId").value;
    const previousBook = adminBooks.find(item => String(item.id) === String(id));

    const payload = {
      title: document.getElementById("title").value.trim(),
      author: document.getElementById("author").value.trim(),
      genre: document.getElementById("genre").value.trim() || null,
      rating: Number(document.getElementById("rating").value),
      finished_date: document.getElementById("finishedDate").value || null,
      pages: Number(document.getElementById("pages").value) || null,
      mood: document.getElementById("mood").value.trim() || null,
      verdict: document.getElementById("verdict").value.trim() || null,
      review: document.getElementById("review").value.trim(),
      quote: document.getElementById("quote").value.trim() || null,
      favorite: document.getElementById("favorite").checked,
      published: document.getElementById("published").checked,
      cover_url: uploadedCover?.url || document.getElementById("currentCoverUrl").value || null,
      cover_path: uploadedCover?.path || null,
      updated_at: new Date().toISOString()
    };

    if (id && !uploadedCover) {
      delete payload.cover_path;
    }

    const query = id
      ? client.from("books").update(payload).eq("id", id)
      : client.from("books").insert(payload);
    const { error } = await query;
    if (error) throw error;
    if (uploadedCover && previousBook?.cover_path) {
      await client.storage.from("book-covers").remove([previousBook.cover_path]);
    }

    resetForm();
    await loadAdminBooks();
    showToast(id ? "Review updated." : "Book published to the shelves.");
  } catch (error) {
    setMessage("formMessage", error.message, true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = `publish to the shelves <span>→</span>`;
  }
});

function editBook(id) {
  const book = adminBooks.find(item => String(item.id) === String(id));
  if (!book) return;

  document.getElementById("bookId").value = book.id;
  document.getElementById("currentCoverUrl").value = book.cover_url || "";
  ["title", "author", "genre", "rating", "finishedDate", "pages", "mood", "verdict", "review", "quote"]
    .forEach(key => {
      const databaseKey = key === "finishedDate" ? "finished_date" : key;
      document.getElementById(key).value = book[databaseKey] ?? "";
    });
  document.getElementById("favorite").checked = Boolean(book.favorite);
  document.getElementById("published").checked = Boolean(book.published);
  document.getElementById("formMode").textContent = "EDITING ENTRY";
  document.getElementById("formHeading").textContent = book.title;
  document.getElementById("cancelEdit").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteBook(id) {
  const book = adminBooks.find(item => String(item.id) === String(id));
  if (!book || !confirm(`Hapus "${book.title}"? Ini tidak bisa dibatalkan.`)) return;

  const { error } = await client.from("books").delete().eq("id", id);
  if (error) return showToast(error.message);
  if (book.cover_path) {
    await client.storage.from("book-covers").remove([book.cover_path]);
  }
  await loadAdminBooks();
  showToast("Entry deleted.");
}

function resetForm() {
  bookForm.reset();
  document.getElementById("bookId").value = "";
  document.getElementById("currentCoverUrl").value = "";
  document.getElementById("published").checked = true;
  document.getElementById("formMode").textContent = "NEW ENTRY";
  document.getElementById("formHeading").textContent = "Add a book";
  document.getElementById("cancelEdit").hidden = true;
  setMessage("formMessage", "");
}

document.addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  if (edit) editBook(edit.dataset.edit);
  if (remove) deleteBook(remove.dataset.delete);
});

document.getElementById("cancelEdit").addEventListener("click", resetForm);
document.getElementById("refreshButton").addEventListener("click", loadAdminBooks);
client?.auth.onAuthStateChange((_event, session) => toggleViews(Boolean(session)));
checkSession();

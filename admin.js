document.addEventListener("DOMContentLoaded", () => {
  const API = String(window.LAUNDRY_API_URL || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const tokenKey = "laundry_admin_token";
  let offset = 0;
  let total = 0;
  const pageSize = 50;
  const token = () => localStorage.getItem(tokenKey) || "";
  function message(el, text, type="") { el.textContent = text; el.className = "message" + (type ? " " + type : ""); }
  async function request(path) {
    const response = await fetch(API + path, { headers: { Authorization: "Bearer " + token() } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) logout(false);
      throw new Error(data.error || "Could not load records.");
    }
    return data;
  }
  function logout(showMessage=true) {
    localStorage.removeItem(tokenKey);
    $("dashboard").hidden = true;
    $("loginPanel").hidden = false;
    $("adminPassword").value = "";
    if (showMessage) message($("loginMessage"), "You have been logged out.", "success");
  }
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("loginButton");
    button.disabled = true;
    message($("loginMessage"), "Checking admin credentials…");
    try {
      const response = await fetch(API + "/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: $("adminUsername").value.trim(), password: $("adminPassword").value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Login failed.");
      localStorage.setItem(tokenKey, data.token);
      $("adminPassword").value = "";
      await enterDashboard(data.admin.username);
    } catch (error) { message($("loginMessage"), error.message, "error"); }
    finally { button.disabled = false; }
  });
  $("logoutButton").addEventListener("click", () => logout());
  $("filterForm").addEventListener("submit", event => { event.preventDefault(); loadRecords(true); });
  $("clearFilters").addEventListener("click", () => { $("searchInput").value = ""; $("dateInput").value = ""; loadRecords(true); });
  $("loadMore").addEventListener("click", () => loadRecords(false));
  $("closeDetail").addEventListener("click", () => { $("detailPanel").hidden = true; });
  async function enterDashboard(username) {
    $("loginPanel").hidden = true;
    $("dashboard").hidden = false;
    $("adminName").textContent = username || "Warden";
    try {
      const data = await request("/api/admin/overview");
      $("studentCount").textContent = data.overview.students;
      $("receiptCount").textContent = data.overview.receipts;
      $("recentCount").textContent = data.overview.last_seven_days;
      await loadRecords(true);
    } catch (error) { message($("recordMessage"), error.message, "error"); }
  }
  function makeRecord(receipt) {
    const card = document.createElement("article"); card.className = "record";
    const main = document.createElement("div"); main.className = "record-main";
    const name = document.createElement("strong"); name.textContent = receipt.student_name + " · Room " + receipt.room_number;
    const sub = document.createElement("small"); sub.textContent = receipt.receipt_number + " · " + new Date(receipt.created_at).toLocaleString();
    main.append(name, sub);
    const meta = document.createElement("div"); meta.className = "record-meta";
    const count = document.createElement("b"); count.textContent = receipt.total_items + " items";
    const view = document.createElement("button"); view.type = "button"; view.textContent = "View receipt";
    view.addEventListener("click", () => viewReceipt(receipt.id, view));
    meta.append(count, view); card.append(main, meta);
    return card;
  }
  async function loadRecords(reset) {
    if (reset) { offset = 0; $("recordsList").innerHTML = ""; $("detailPanel").hidden = true; }
    const button = $("loadMore"); button.disabled = true;
    message($("recordMessage"), "Loading submissions…");
    try {
      const params = new URLSearchParams({ search: $("searchInput").value.trim(), date: $("dateInput").value, limit: String(pageSize), offset: String(offset) });
      const data = await request("/api/admin/receipts?" + params.toString());
      total = data.total;
      data.receipts.forEach(receipt => $("recordsList").appendChild(makeRecord(receipt)));
      offset += data.receipts.length;
      message($("recordMessage"), total ? "Showing " + offset + " of " + total + " submissions." : "No matching laundry submissions.");
      button.hidden = offset >= total;
      if (!total) {
        const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "No records found for these filters."; $("recordsList").appendChild(empty);
      }
    } catch (error) { message($("recordMessage"), error.message, "error"); }
    finally { button.disabled = false; }
  }
  async function viewReceipt(id, button) {
    button.disabled = true;
    try {
      const data = await request("/api/admin/receipts/" + encodeURIComponent(id));
      const receipt = data.receipt;
      $("detailTitle").textContent = receipt.receipt_number;
      $("detailStudent").textContent = receipt.student_name + " · Room " + receipt.room_number + " · " + new Date(receipt.created_at).toLocaleString() + " · " + receipt.total_items + " items";
      $("detailItems").innerHTML = "";
      Object.entries(receipt.items || {}).forEach(([name, qty]) => {
        const row = document.createElement("div"); row.className = "detail-item";
        const item = document.createElement("span"); item.textContent = name;
        const amount = document.createElement("b"); amount.textContent = qty;
        row.append(item, amount); $("detailItems").appendChild(row);
      });
      $("detailPhotos").innerHTML = "";
      (receipt.photos || []).forEach((src, index) => {
        const img = document.createElement("img"); img.src = src; img.alt = "Student-submitted laundry photo " + (index + 1);
        $("detailPhotos").appendChild(img);
      });
      $("detailPanel").hidden = false;
      $("detailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { message($("recordMessage"), error.message, "error"); }
    finally { button.disabled = false; }
  }
  if (token()) enterDashboard("Warden").catch(() => logout(false));
});
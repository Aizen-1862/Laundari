/* LAUNDRY — account-aware client */
document.addEventListener("DOMContentLoaded", () => {
  const API = String(window.LAUNDRY_API_URL || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const items = ["Shirts","T-shirts","Track pants","Towels","Underwear","Pants","Shorts","Bedsheets","Pillow covers","Inner Top Wear"];
  const quantities = Object.fromEntries(items.map(item => [item, 0]));
  const MAX_PHOTOS = 6;
  let selectedPhotos = [];
  let authMode = "login";
  let currentReceipt = null;
  let currentUser = null;

  const token = () => localStorage.getItem("laundry_token") || "";
  const showScreen = id => {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  };
  const setMessage = (element, message, type = "") => {
    element.textContent = message || "";
    element.className = "form-message" + (type ? " " + type + "-text" : "");
  };
  async function api(path, options = {}) {
    if (!API || API.includes("your-api-url")) throw new Error("The LAUNDRY API has not been configured yet.");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token()) headers.Authorization = "Bearer " + token();
    const response = await fetch(API + path, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/register") logout(false);
      throw new Error(data.error || "Request failed. Please try again.");
    }
    return data;
  }

  function saveDraft() {
    try { sessionStorage.setItem("laundry_draft", JSON.stringify({ quantities, selectedPhotos })); }
    catch (error) { console.warn("Draft could not be stored in this browser session.", error); }
  }
  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem("laundry_draft") || "null");
      if (!draft) return;
      items.forEach(item => quantities[item] = Math.max(0, Math.min(100, Number(draft.quantities?.[item]) || 0)));
      selectedPhotos = Array.isArray(draft.selectedPhotos) ? draft.selectedPhotos.slice(0, MAX_PHOTOS).filter(p => typeof p === "string" && p.startsWith("data:image/")) : [];
    } catch { sessionStorage.removeItem("laundry_draft"); }
  }

  function updateTotal() {
    const total = items.reduce((sum, item) => sum + quantities[item], 0);
    $("liveTotal").textContent = total;
    return total;
  }
  function renderItems() {
    $("itemsGrid").innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "item";
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item;
      const controls = document.createElement("div");
      controls.className = "controls";
      const minus = document.createElement("button");
      minus.className = "qty"; minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "Remove " + item);
      const number = document.createElement("span");
      number.className = "num"; number.textContent = quantities[item];
      const plus = document.createElement("button");
      plus.className = "qty"; plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "Add " + item);
      plus.addEventListener("click", () => {
        if (quantities[item] >= 100) return;
        quantities[item]++; number.textContent = quantities[item]; updateTotal(); saveDraft();
        card.classList.remove("bump"); void card.offsetWidth; card.classList.add("bump");
      });
      minus.addEventListener("click", () => {
        if (!quantities[item]) return;
        quantities[item]--; number.textContent = quantities[item]; updateTotal(); saveDraft();
      });
      controls.append(minus, number, plus);
      card.append(name, controls);
      $("itemsGrid").appendChild(card);
    });
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read this photo."));
      reader.onload = event => {
        const image = new Image();
        image.onerror = () => reject(new Error("This image could not be opened."));
        image.onload = () => {
          let width = image.naturalWidth, height = image.naturalHeight;
          const max = 900;
          if (width > max || height > max) {
            const ratio = Math.min(max / width, max / height);
            width = Math.round(width * ratio); height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Image processing is unavailable."));
          context.drawImage(image, 0, 0, width, height);
          const result = canvas.toDataURL("image/jpeg", 0.58);
          canvas.width = 1; canvas.height = 1;
          resolve(result);
        };
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function renderPhotoPreview() {
    $("photoPreview").innerHTML = "";
    $("photoCount").textContent = selectedPhotos.length + (selectedPhotos.length === 1 ? " photo" : " photos");
    selectedPhotos.forEach((photo, index) => {
      const box = document.createElement("div"); box.className = "photo-preview-item";
      const image = document.createElement("img"); image.src = photo; image.alt = "Laundry photo " + (index + 1);
      const remove = document.createElement("button"); remove.className = "remove-photo"; remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", "Remove photo");
      remove.addEventListener("click", () => { selectedPhotos.splice(index, 1); renderPhotoPreview(); saveDraft(); });
      box.append(image, remove); $("photoPreview").appendChild(box);
    });
  }
  async function handleFiles(files) {
    const remaining = MAX_PHOTOS - selectedPhotos.length;
    if (remaining <= 0) return alert("You can add up to 6 photos.");
    const list = Array.from(files || []).filter(file => file.type.startsWith("image/")).slice(0, remaining);
    try {
      for (const file of list) selectedPhotos.push(await compressImage(file));
      renderPhotoPreview(); saveDraft();
    } catch (error) { alert(error.message || "Could not process this photo. Please try again."); }
  }

  // Keep the camera input mounted and save the in-progress form before Android switches apps.
  $("cameraBtn").addEventListener("click", () => {
    saveDraft();
    $("cameraInput").value = "";
    $("cameraInput").click();
  });
  $("galleryBtn").addEventListener("click", () => { $("galleryInput").value = ""; $("galleryInput").click(); });
  $("cameraInput").addEventListener("change", event => handleFiles(event.target.files));
  $("galleryInput").addEventListener("change", event => handleFiles(event.target.files));

  function setAuthMode(mode) {
    authMode = mode;
    $("loginTab").classList.toggle("active", mode === "login");
    $("registerTab").classList.toggle("active", mode === "register");
    $("authSubmit").querySelector("span").textContent = mode === "login" ? "Login" : "Create account";
    $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
    $("authPassword").placeholder = mode === "login" ? "Enter your password" : "Create a password (6+ characters)";
    setMessage($("authMessage"), "");
  }
  $("loginTab").addEventListener("click", () => setAuthMode("login"));
  $("registerTab").addEventListener("click", () => setAuthMode("register"));
  $("authForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("authSubmit");
    button.disabled = true;
    button.querySelector("span").textContent = authMode === "login" ? "Logging in..." : "Creating account...";
    setMessage($("authMessage"), "Please wait...");
    try {
      const data = await api("/api/auth/" + authMode, {
        method: "POST",
        body: JSON.stringify({ name: $("authName").value.trim(), roomNumber: $("authRoom").value.trim(), password: $("authPassword").value })
      });
      localStorage.setItem("laundry_token", data.token);
      currentUser = data.user;
      $("authPassword").value = "";
      await enterApp();
    } catch (error) { setMessage($("authMessage"), error.message, "error"); }
    finally { button.disabled = false; button.querySelector("span").textContent = authMode === "login" ? "Login" : "Create account"; }
  });

  $("forgotBtn").addEventListener("click", () => {
    $("resetCard").hidden = false;
    $("resetName").value = $("authName").value.trim();
    $("resetRoom").value = $("authRoom").value.trim();
    $("resetCard").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("cancelReset").addEventListener("click", () => { $("resetCard").hidden = true; setMessage($("resetMessage"), ""); });
  $("resetSubmit").addEventListener("click", async () => {
    const button = $("resetSubmit"); button.disabled = true;
    setMessage($("resetMessage"), "Verifying recovery details...");
    try {
      const data = await api("/api/auth/reset", { method: "POST", body: JSON.stringify({
        name: $("resetName").value.trim(), roomNumber: $("resetRoom").value.trim(),
        recoveryPhrase: $("resetPhrase").value, newPassword: $("newPassword").value
      }) });
      setMessage($("resetMessage"), data.message, "success");
      $("resetPhrase").value = ""; $("newPassword").value = "";
    } catch (error) { setMessage($("resetMessage"), error.message, "error"); }
    finally { button.disabled = false; }
  });

  async function enterApp() {
    if (!currentUser) {
      const data = await api("/api/auth/me");
      currentUser = data.user;
    }
    $("welcomeName").textContent = currentUser.name;
    restoreDraft(); renderItems(); updateTotal(); renderPhotoPreview();
    showScreen("formScreen");
  }
  function logout(show = true) {
    localStorage.removeItem("laundry_token");
    currentUser = null; currentReceipt = null;
    if (show) setMessage($("authMessage"), "You have been logged out.", "success");
    showScreen("authScreen");
  }
  $("logoutBtn").addEventListener("click", () => logout());
  $("historyLogoutBtn").addEventListener("click", () => logout());

  function buildReceipt(receipt) {
    currentReceipt = receipt;
    const created = new Date(receipt.created_at || receipt.createdAt || Date.now());
    $("receiptNumber").textContent = receipt.receipt_number || receipt.receiptNumber || "—";
    $("receiptDate").textContent = created.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    $("receiptTime").textContent = created.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    $("totalItems").textContent = receipt.total_items || receipt.totalItems || 0;
    $("receiptItems").innerHTML = "";
    const savedItems = receipt.items || {};
    Object.entries(savedItems).forEach(([item, quantity]) => {
      const row = document.createElement("div"); row.className = "receipt-row";
      const name = document.createElement("span"); name.textContent = item;
      const qty = document.createElement("span"); qty.textContent = quantity;
      row.append(name, qty); $("receiptItems").appendChild(row);
    });
    const photos = Array.isArray(receipt.photos) ? receipt.photos : [];
    $("receiptPhotoGrid").innerHTML = "";
    $("receiptPhotos").classList.toggle("has-photos", photos.length > 0);
    photos.forEach((photo, index) => {
      const image = document.createElement("img"); image.src = photo; image.alt = "Receipt photo " + (index + 1);
      $("receiptPhotoGrid").appendChild(image);
    });
    $("receiptHeaderText");
    showScreen("receiptScreen");
  }

  $("submitBtn").addEventListener("click", async () => {
    const total = updateTotal();
    $("error").textContent = "";
    if (!total) { $("error").textContent = "Please select at least one laundry item."; return; }
    const button = $("submitBtn"); button.disabled = true; button.querySelector("span").textContent = "Saving receipt...";
    try {
      const cleanItems = Object.fromEntries(items.filter(item => quantities[item] > 0).map(item => [item, quantities[item]]));
      const data = await api("/api/receipts", { method: "POST", body: JSON.stringify({ items: cleanItems, photos: selectedPhotos }) });
      sessionStorage.removeItem("laundry_draft");
      buildReceipt(data.receipt);
    } catch (error) { $("error").textContent = error.message; }
    finally { button.disabled = false; button.querySelector("span").textContent = "Submit Laundry"; }
  });

  async function loadHistory() {
    $("historyList").innerHTML = "";
    setMessage($("historyMessage"), "Loading your receipts...");
    try {
      const data = await api("/api/receipts");
      const receipts = data.receipts || [];
      setMessage($("historyMessage"), receipts.length ? receipts.length + " saved receipt" + (receipts.length === 1 ? "" : "s") : "");
      if (!receipts.length) {
        const empty = document.createElement("div"); empty.className = "history-empty"; empty.textContent = "No receipts yet. Your submissions will appear here."; $("historyList").appendChild(empty); return;
      }
      receipts.forEach(receipt => {
        const card = document.createElement("article"); card.className = "history-card";
        const top = document.createElement("div"); top.className = "history-card-top";
        const left = document.createElement("div");
        const number = document.createElement("strong"); number.textContent = receipt.receipt_number;
        const date = document.createElement("small"); date.textContent = new Date(receipt.created_at).toLocaleString();
        left.append(number, document.createElement("br"), date);
        const total = document.createElement("strong"); total.textContent = receipt.total_items + " items";
        top.append(left, total);
        const summary = document.createElement("p"); summary.textContent = Object.entries(receipt.items || {}).map(([name, qty]) => name + " × " + qty).join(" · ") + ((receipt.photos || []).length ? " · " + receipt.photos.length + " photo(s)" : "");
        const view = document.createElement("button"); view.type = "button"; view.textContent = "View receipt";
        view.addEventListener("click", async () => {
          view.disabled = true;
          try { const result = await api("/api/receipts/" + encodeURIComponent(receipt.id)); buildReceipt(result.receipt); }
          catch (error) { alert(error.message); }
          finally { view.disabled = false; }
        });
        card.append(top, summary, view); $("historyList").appendChild(card);
      });
    } catch (error) { setMessage($("historyMessage"), error.message, "error"); }
  }
  $("historyBtn").addEventListener("click", async () => { showScreen("historyScreen"); await loadHistory(); });
  $("historyFromReceipt").addEventListener("click", async () => { showScreen("historyScreen"); await loadHistory(); });
  $("backToForm").addEventListener("click", () => showScreen("formScreen"));
  $("newFromHistory").addEventListener("click", () => showScreen("formScreen"));

  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = () => resolve(window.html2canvas);
      script.onerror = () => reject(new Error("Receipt image library could not be loaded."));
      document.head.appendChild(script);
    });
  }
  $("downloadBtn").addEventListener("click", async () => {
    const button = $("downloadBtn"); button.disabled = true; $("downloadMsg").textContent = "Preparing receipt...";
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas($("receiptCapture"), { scale: 1.25, backgroundColor: "#ffffff", logging: false });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      canvas.width = 1; canvas.height = 1;
      if (!blob) throw new Error("Could not create receipt image.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "Laundry-Receipt-" + $("receiptNumber").textContent + ".png";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      $("downloadMsg").textContent = "✓ Receipt saved successfully!";
    } catch (error) { $("downloadMsg").textContent = error.message; }
    finally { button.disabled = false; }
  });

  $("newBtn").addEventListener("click", () => {
    items.forEach(item => quantities[item] = 0);
    selectedPhotos = []; saveDraft(); renderItems(); updateTotal(); renderPhotoPreview();
    $("error").textContent = ""; $("downloadMsg").textContent = "";
    showScreen("formScreen");
  });

  async function start() {
    renderItems(); restoreDraft(); updateTotal(); renderPhotoPreview();
    if (!API) { setMessage($("authMessage"), "API URL is missing. Configure config.js before using accounts.", "error"); return; }
    if (token()) {
      try { await enterApp(); }
      catch { logout(false); }
    }
  }
  start();
});

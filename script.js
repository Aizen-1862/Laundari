/* =========================================================
   LAUNDRY V3 — COMPLETE SCRIPT
   Clothes Selection + Photos + Receipt + Download
========================================================= */

const items = [
  { id: "shirts", name: "Shirts" },
  { id: "pants", name: "Pants" },
  { id: "tshirts", name: "T-Shirts" },
  { id: "shorts", name: "Shorts" },
  { id: "trackpants", name: "Track Pants" },
  { id: "bedsheets", name: "Bedsheets" },
  { id: "towels", name: "Towels" },
  { id: "pillowcovers", name: "Pillow Covers" },
  { id: "underwear", name: "Underwear" },
  { id: "innertopwear", name: "Inner Top Wear" }
];

const quantities = {};

items.forEach(item => {
  quantities[item.id] = 0;
});


/* =========================================================
   GET ELEMENTS
========================================================= */

const itemsGrid = document.getElementById("itemsGrid");
const liveTotal = document.getElementById("liveTotal");
const submitBtn = document.getElementById("submitBtn");
const error = document.getElementById("error");

const formScreen = document.getElementById("formScreen");
const receiptScreen = document.getElementById("receiptScreen");

const receiptNumber = document.getElementById("receiptNumber");
const receiptDate = document.getElementById("receiptDate");
const receiptTime = document.getElementById("receiptTime");
const receiptItems = document.getElementById("receiptItems");
const totalItems = document.getElementById("totalItems");

const downloadBtn = document.getElementById("downloadBtn");
const newBtn = document.getElementById("newBtn");
const downloadMsg = document.getElementById("downloadMsg");


/* =========================================================
   CREATE ITEM CARDS
========================================================= */

function renderItems() {

  if (!itemsGrid) return;

  itemsGrid.innerHTML = "";

  items.forEach(item => {

    const card = document.createElement("div");

    card.className = "item-card";

    card.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        <span class="item-count" id="count-${item.id}">0</span>
      </div>

      <div class="quantity-controls">

        <button
          type="button"
          class="qty-btn minus"
          data-id="${item.id}"
        >−</button>

        <span
          class="quantity"
          id="qty-${item.id}"
        >0</span>

        <button
          type="button"
          class="qty-btn plus"
          data-id="${item.id}"
        >+</button>

      </div>
    `;

    itemsGrid.appendChild(card);
  });


  /* PLUS BUTTONS */

  document.querySelectorAll(".qty-btn.plus").forEach(button => {

    button.addEventListener("click", () => {

      const id = button.dataset.id;

      if (quantities[id] < 99) {
        quantities[id]++;
      }

      updateItem(id, button);
    });

  });


  /* MINUS BUTTONS */

  document.querySelectorAll(".qty-btn.minus").forEach(button => {

    button.addEventListener("click", () => {

      const id = button.dataset.id;

      if (quantities[id] > 0) {
        quantities[id]--;
      }

      updateItem(id, button);
    });

  });

}


/* =========================================================
   UPDATE QUANTITY
========================================================= */

function updateItem(id, button) {

  const qty = quantities[id];

  const quantityElement = document.getElementById(`qty-${id}`);
  const countElement = document.getElementById(`count-${id}`);

  if (quantityElement) {
    quantityElement.textContent = qty;
  }

  if (countElement) {
    countElement.textContent = qty > 0 ? `${qty} selected` : "";
  }

  if (button) {

    button.classList.remove("bump");

    void button.offsetWidth;

    button.classList.add("bump");
  }

  updateTotal();
}


/* =========================================================
   TOTAL
========================================================= */

function updateTotal() {

  const total = Object.values(quantities).reduce(
    (sum, value) => sum + value,
    0
  );

  if (liveTotal) {
    liveTotal.textContent = total;
  }

  return total;
}


/* =========================================================
   PHOTO FEATURE
========================================================= */

let selectedPhotos = [];


/* Create photo section automatically */

function createPhotoSection() {

  if (!formScreen) return;

  /* Don't create twice */

  if (document.getElementById("photoSection")) return;


  const section = document.createElement("div");

  section.id = "photoSection";

  section.style.cssText = `
    margin-top:18px;
    background:#ffffff;
    border:1px solid #eee3d7;
    border-radius:22px;
    padding:18px;
    box-shadow:0 10px 30px rgba(0,0,0,.05);
  `;


  section.innerHTML = `

    <div style="
      font-size:18px;
      font-weight:800;
      color:#17130f;
      margin-bottom:5px;
    ">
      📸 Add Clothes Photos
    </div>

    <div style="
      font-size:13px;
      color:#81776e;
      margin-bottom:14px;
      line-height:1.5;
    ">
      Add photos of the clothes you're giving to laundry.
      These photos will also appear on your receipt.
    </div>

    <input
      type="file"
      id="clothesPhotoInput"
      accept="image/*"
      multiple
      capture="environment"
      style="display:none;"
    >

    <button
      type="button"
      id="addPhotoBtn"
      style="
        width:100%;
        border:2px dashed #ff7200;
        background:#fff7ef;
        color:#ff7200;
        padding:15px;
        border-radius:16px;
        font-size:15px;
        font-weight:800;
        cursor:pointer;
      "
    >
      📷 Add Photos
    </button>

    <div
      id="photoPreview"
      style="
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
        margin-top:15px;
      "
    ></div>

    <div
      id="photoCount"
      style="
        margin-top:10px;
        font-size:12px;
        color:#81776e;
        text-align:center;
      "
    ></div>

  `;


  /*
    Put photo section before submit button
  */

  if (submitBtn && submitBtn.parentElement) {

    submitBtn.parentElement.insertBefore(
      section,
      submitBtn
    );

  } else {

    formScreen.appendChild(section);

  }


  const input = document.getElementById("clothesPhotoInput");
  const addButton = document.getElementById("addPhotoBtn");


  addButton.addEventListener("click", () => {
    input.click();
  });


  input.addEventListener("change", event => {

    const files = Array.from(event.target.files);

    files.forEach(file => {

      if (!file.type.startsWith("image/")) {
        return;
      }

      /*
        Limit each photo to a reasonable size.
        This keeps the downloaded receipt from becoming huge.
      */

      if (file.size > 8 * 1024 * 1024) {

        alert(
          `${file.name} is larger than 8MB and was skipped.`
        );

        return;
      }


      const reader = new FileReader();


      reader.onload = e => {

        selectedPhotos.push({
          src: e.target.result,
          name: file.name
        });

        renderPhotoPreview();

      };


      reader.readAsDataURL(file);

    });


    /*
      Allows selecting the same photo again later.
    */

    input.value = "";

  });

}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

function renderPhotoPreview() {

  const preview = document.getElementById("photoPreview");
  const count = document.getElementById("photoCount");

  if (!preview) return;

  preview.innerHTML = "";


  selectedPhotos.forEach((photo, index) => {

    const wrapper = document.createElement("div");

    wrapper.style.cssText = `
      position:relative;
      aspect-ratio:1/1;
      border-radius:14px;
      overflow:hidden;
      background:#f4eee8;
      border:1px solid #eee3d7;
    `;


    wrapper.innerHTML = `

      <img
        src="${photo.src}"
        alt="Laundry clothes photo"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        "
      >

      <button
        type="button"
        data-photo-index="${index}"
        style="
          position:absolute;
          top:5px;
          right:5px;
          width:27px;
          height:27px;
          border:none;
          border-radius:50%;
          background:rgba(0,0,0,.7);
          color:#fff;
          font-size:15px;
          font-weight:bold;
          cursor:pointer;
        "
      >
        ×
      </button>

    `;


    const removeButton = wrapper.querySelector("button");


    removeButton.addEventListener("click", () => {

      selectedPhotos.splice(index, 1);

      renderPhotoPreview();

    });


    preview.appendChild(wrapper);

  });


  if (count) {

    if (selectedPhotos.length === 0) {

      count.textContent = "";

    } else {

      count.textContent =
        `${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"} added`;

    }

  }

}


/* =========================================================
   RECEIPT PHOTO SECTION
========================================================= */

function addPhotosToReceipt() {

  const existing = document.getElementById("receiptPhotos");

  if (existing) {
    existing.remove();
  }


  /*
    If there are no photos, don't show the section.
  */

  if (selectedPhotos.length === 0) {
    return;
  }


  const container = document.createElement("div");

  container.id = "receiptPhotos";


  container.style.cssText = `
    margin-top:22px;
    padding-top:18px;
    border-top:1px dashed #ddd0c3;
  `;


  container.innerHTML = `

    <div style="
      font-size:14px;
      font-weight:800;
      color:#17130f;
      margin-bottom:12px;
    ">
      📸 Clothes Photos
    </div>

    <div
      id="receiptPhotoGrid"
      style="
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:10px;
      "
    ></div>

  `;


  /*
    Put it inside the receipt capture area.
  */

  const receiptCapture =
    document.getElementById("receiptCapture");


  if (receiptCapture) {

    /*
      Insert before footer if possible.
    */

    const footer =
      receiptCapture.querySelector(".receipt-footer");

    if (footer) {

      receiptCapture.insertBefore(
        container,
        footer
      );

    } else {

      receiptCapture.appendChild(container);

    }

  }


  const grid =
    document.getElementById("receiptPhotoGrid");


  selectedPhotos.forEach(photo => {

    const image = document.createElement("img");

    image.src = photo.src;

    image.alt = "Clothes submitted";

    image.style.cssText = `
      width:100%;
      aspect-ratio:1/1;
      object-fit:cover;
      border-radius:14px;
      border:1px solid #eee3d7;
      display:block;
    `;


    grid.appendChild(image);

  });

}


/* =========================================================
   RECEIPT NUMBER
========================================================= */

function generateReceiptNumber() {

  const now = new Date();

  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const random =
    Math.floor(1000 + Math.random() * 9000);


  return `LD-${date}-${random}`;

}


/* =========================================================
   SUBMIT
========================================================= */

if (submitBtn) {

  submitBtn.addEventListener("click", () => {

    const total = updateTotal();


    if (total === 0) {

      if (error) {

        error.textContent =
          "Please select at least one item.";

        error.style.display = "block";

      }

      return;

    }


    if (error) {
      error.textContent = "";
      error.style.display = "none";
    }


    const now = new Date();


    /*
      Receipt number
    */

    if (receiptNumber) {

      receiptNumber.textContent =
        generateReceiptNumber();

    }


    /*
      Date
    */

    if (receiptDate) {

      receiptDate.textContent =
        now.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        );

    }


    /*
      Time
    */

    if (receiptTime) {

      receiptTime.textContent =
        now.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

    }


    /*
      Receipt items
    */

    if (receiptItems) {

      receiptItems.innerHTML = "";


      items.forEach(item => {

        const qty = quantities[item.id];


        if (qty > 0) {

          const row =
            document.createElement("div");

          row.className = "receipt-item";


          row.innerHTML = `
            <span>${item.name}</span>
            <strong>× ${qty}</strong>
          `;


          receiptItems.appendChild(row);

        }

      });

    }


    /*
      Total
    */

    if (totalItems) {

      totalItems.textContent =
        `${total} item${total === 1 ? "" : "s"}`;

    }


    /*
      Add selected photos to receipt
    */

    addPhotosToReceipt();


    /*
      Switch screens
    */

    if (formScreen) {

      formScreen.style.display = "none";

    }

    if (receiptScreen) {

      receiptScreen.style.display = "block";

      receiptScreen.classList.remove("screen-in");

      void receiptScreen.offsetWidth;

      receiptScreen.classList.add("screen-in");

    }


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  });

}


/* =========================================================
   LOAD HTML2CANVAS
========================================================= */

function loadHtml2Canvas() {

  return new Promise((resolve, reject) => {

    /*
      Already loaded
    */

    if (window.html2canvas) {

      resolve(window.html2canvas);

      return;

    }


    const script =
      document.createElement("script");


    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";


    script.onload = () => {

      resolve(window.html2canvas);

    };


    script.onerror = () => {

      reject(
        new Error("Could not load receipt image library.")
      );

    };


    document.head.appendChild(script);

  });

}


/* =========================================================
   DOWNLOAD RECEIPT
========================================================= */

if (downloadBtn) {

  downloadBtn.addEventListener("click", async () => {

    const receipt =
      document.getElementById("receiptCapture");


    if (!receipt) {

      alert("Receipt could not be found.");

      return;

    }


    try {

      downloadBtn.disabled = true;

      downloadBtn.textContent =
        "Preparing Receipt...";


      if (downloadMsg) {

        downloadMsg.textContent =
          "Creating your receipt image...";

      }


      const html2canvas =
        await loadHtml2Canvas();


      /*
        Small delay makes sure all receipt
        images are completely rendered.
      */

      await new Promise(resolve =>
        setTimeout(resolve, 300)
      );


      const canvas =
        await html2canvas(
          receipt,
          {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
          }
        );


      const image =
        canvas.toDataURL(
          "image/png",
          1.0
        );


      const link =
        document.createElement("a");


      const number =
        receiptNumber
          ? receiptNumber.textContent
          : "receipt";


      link.download =
        `Laundry-Receipt-${number}.png`;


      link.href = image;


      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);


      if (downloadMsg) {

        downloadMsg.textContent =
          "✅ Receipt downloaded successfully!";

      }

    }

    catch (err) {

      console.error(
        "Receipt download error:",
        err
      );


      if (downloadMsg) {

        downloadMsg.textContent =
          "Could not download receipt. Please try again.";

      }

      alert(
        "Sorry, the receipt could not be downloaded."
      );

    }

    finally {

      downloadBtn.disabled = false;

      downloadBtn.textContent =
        "Download Receipt";

    }

  });

}


/* =========================================================
   NEW SUBMISSION
========================================================= */

if (newBtn) {

  newBtn.addEventListener("click", () => {

    /*
      Reset quantities
    */

    items.forEach(item => {

      quantities[item.id] = 0;

    });


    /*
      Reset photos
    */

    selectedPhotos = [];


    /*
      Reset UI
    */

    renderItems();

    updateTotal();

    renderPhotoPreview();


    /*
      Remove photos from old receipt
    */

    const receiptPhotos =
      document.getElementById("receiptPhotos");

    if (receiptPhotos) {
      receiptPhotos.remove();
    }


    /*
      Switch screens
    */

    if (receiptScreen) {

      receiptScreen.style.display = "none";

    }

    if (formScreen) {

      formScreen.style.display = "block";

    }


    if (downloadMsg) {

      downloadMsg.textContent = "";

    }


    if (error) {

      error.textContent = "";

      error.style.display = "none";

    }


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  });

}


/* =========================================================
   START APP
========================================================= */

renderItems();

createPhotoSection();

updateTotal();

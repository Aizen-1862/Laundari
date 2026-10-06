/* =========================================================
   LAUNDRY — PHOTO FEATURE
   Built on your original working V2 files
========================================================= */

const items = [
  {id:"shirts",name:"Shirts"},
  {id:"pants",name:"Pants"},
  {id:"tshirts",name:"T-Shirts"},
  {id:"shorts",name:"Shorts"},
  {id:"trackpants",name:"Track Pants"},
  {id:"bedsheets",name:"Bedsheets"},
  {id:"towels",name:"Towels"},
  {id:"pillowcovers",name:"Pillow Covers"},
  {id:"underwear",name:"Underwear"},
  {id:"innertopwear",name:"Inner Top Wear"}
];

const q = Object.fromEntries(
  items.map(x => [x.id, 0])
);

const $ = x => document.getElementById(x);

let selectedPhotos = [];


/* =========================================================
   CREATE ITEM LIST
========================================================= */

function render() {

  $("itemsGrid").innerHTML = items.map(x => `
    <div class="item" id="card-${x.id}">

      <span class="item-name">
        ${x.name}
      </span>

      <div class="controls">

        <button
          class="qty"
          data-id="${x.id}"
          data-change="-1"
          type="button"
        >−</button>

        <span
          class="num"
          id="num-${x.id}"
        >0</span>

        <button
          class="qty"
          data-id="${x.id}"
          data-change="1"
          type="button"
        >+</button>

      </div>

    </div>
  `).join("");

}


/* =========================================================
   TOTAL
========================================================= */

function total() {

  return Object.values(q).reduce(
    (a,b) => a + b,
    0
  );

}


/* =========================================================
   QUANTITY BUTTONS
========================================================= */

$("itemsGrid").addEventListener("click", e => {

  const b = e.target.closest(".qty");

  if (!b) return;

  const id = b.dataset.id;

  const n = Math.max(
    0,
    Math.min(
      99,
      q[id] + Number(b.dataset.change)
    )
  );

  if (n === q[id]) return;

  q[id] = n;

  $("num-" + id).textContent = n;

  $("liveTotal").textContent = total();

  const c = $("card-" + id);

  c.classList.remove("bump");

  void c.offsetWidth;

  c.classList.add("bump");

});


/* =========================================================
   RECEIPT NUMBER
========================================================= */

function rid() {

  const d = new Date();

  const s =
    `${d.getFullYear()}` +
    `${String(d.getMonth()+1).padStart(2,"0")}` +
    `${String(d.getDate()).padStart(2,"0")}`;

  return `LD-${s}-${Math.floor(1000 + Math.random() * 9000)}`;

}


/* =========================================================
   PHOTO UPLOAD UI
========================================================= */

function createPhotoSection() {

  const section = document.createElement("section");

  section.id = "photoSection";

  section.innerHTML = `

    <div class="photo-box">

      <div class="photo-heading">
        <div>
          <small>OPTIONAL</small>
          <h2>📸 Clothes Photos</h2>
        </div>

        <span id="photoCount">
          0 photos
        </span>
      </div>

      <p class="photo-description">
        Add photos of the clothes you're giving to laundry.
        They'll be saved on your receipt.
      </p>

      <div class="photo-buttons">

        <button
          type="button"
          id="cameraBtn"
          class="photo-button"
        >
          📷 Take Photo
        </button>

        <button
          type="button"
          id="galleryBtn"
          class="photo-button"
        >
          🖼️ Gallery
        </button>

      </div>

      <input
        type="file"
        id="cameraInput"
        accept="image/*"
        capture="environment"
        multiple
        hidden
      >

      <input
        type="file"
        id="galleryInput"
        accept="image/*"
        multiple
        hidden
      >

      <div
        id="photoPreview"
        class="photo-preview"
      ></div>

    </div>

  `;


  /*
    Put photo section between item card
    and submit button.
  */

  const submitButton = $("submitBtn");

  submitButton.parentNode.insertBefore(
    section,
    submitButton
  );


  $("cameraBtn").onclick = () => {
    $("cameraInput").click();
  };


  $("galleryBtn").onclick = () => {
    $("galleryInput").click();
  };


  $("cameraInput").addEventListener(
    "change",
    handlePhotos
  );


  $("galleryInput").addEventListener(
    "change",
    handlePhotos
  );

}


/* =========================================================
   HANDLE PHOTOS
========================================================= */

function handlePhotos(event) {

  const files = Array.from(
    event.target.files || []
  );

  files.forEach(file => {

    if (!file.type.startsWith("image/")) {
      return;
    }

    /*
      Maximum 8MB per photo.
    */

    if (file.size > 8 * 1024 * 1024) {

      alert(
        `${file.name} is bigger than 8MB. Please choose a smaller photo.`
      );

      return;

    }


    const reader = new FileReader();


    reader.onload = e => {

      selectedPhotos.push({
        src: e.target.result
      });

      renderPhotos();

    };


    reader.readAsDataURL(file);

  });


  /*
    Allows selecting the same image again.
  */

  event.target.value = "";

}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

function renderPhotos() {

  const preview = $("photoPreview");

  if (!preview) return;

  preview.innerHTML = "";


  selectedPhotos.forEach((photo,index) => {

    const wrapper =
      document.createElement("div");

    wrapper.className = "photo-preview-item";


    const img =
      document.createElement("img");

    img.src = photo.src;

    img.alt = "Clothes photo";


    const remove =
      document.createElement("button");

    remove.type = "button";

    remove.className = "remove-photo";

    remove.textContent = "×";


    remove.onclick = () => {

      selectedPhotos.splice(index,1);

      renderPhotos();

    };


    wrapper.appendChild(img);

    wrapper.appendChild(remove);

    preview.appendChild(wrapper);

  });


  $("photoCount").textContent =
    `${selectedPhotos.length} ${
      selectedPhotos.length === 1
        ? "photo"
        : "photos"
    }`;

}


/* =========================================================
   ADD PHOTOS TO RECEIPT
========================================================= */

function addPhotosToReceipt() {

  const old =
    $("receiptPhotos");

  if (old) {
    old.remove();
  }


  if (selectedPhotos.length === 0) {
    return;
  }


  const section =
    document.createElement("div");

  section.id = "receiptPhotos";

  section.innerHTML = `

    <div class="receipt-photo-title">
      CLOTHES PHOTOS
    </div>

    <div
      id="receiptPhotoGrid"
      class="receipt-photo-grid"
    ></div>

  `;


  const receipt =
    $("receiptCapture");


  receipt.insertBefore(
    section,
    receipt.querySelector("footer")
  );


  const grid =
    $("receiptPhotoGrid");


  selectedPhotos.forEach(photo => {

    const img =
      document.createElement("img");

    img.src = photo.src;

    img.alt = "Laundry clothes";

    grid.appendChild(img);

  });

}


/* =========================================================
   SUBMIT
========================================================= */

$("submitBtn").onclick = () => {

  if (!total()) {

    $("error").textContent =
      "Please select at least one item first.";

    return;

  }


  $("error").textContent = "";


  const d = new Date();


  $("receiptNumber").textContent =
    rid();


  $("receiptDate").textContent =
    d.toLocaleDateString(
      "en-IN",
      {
        day:"2-digit",
        month:"short",
        year:"numeric"
      }
    );


  $("receiptTime").textContent =
    d.toLocaleTimeString(
      "en-IN",
      {
        hour:"2-digit",
        minute:"2-digit",
        hour12:true
      }
    );


  $("totalItems").textContent =
    total();


  $("receiptItems").innerHTML =
    items
      .filter(x => q[x.id] > 0)
      .map(x => `
        <div class="row">
          <span>${x.name}</span>
          <span>${q[x.id]}</span>
        </div>
      `)
      .join("");


  /*
    NEW:
    Add photos to receipt.
  */

  addPhotosToReceipt();


  $("downloadMsg").textContent = "";


  $("formScreen").classList.remove("active");

  $("receiptScreen").classList.add("active");


  scrollTo({
    top:0,
    behavior:"smooth"
  });

};


/* =========================================================
   HTML2CANVAS
========================================================= */

function loadCanvas() {

  return new Promise((ok,no) => {

    const s =
      document.createElement("script");

    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

    s.onload = ok;

    s.onerror = no;

    document.head.appendChild(s);

  });

}


/* =========================================================
   DOWNLOAD RECEIPT
========================================================= */

$("downloadBtn").onclick = async () => {

  $("downloadMsg").textContent =
    "Preparing your receipt…";

  $("downloadBtn").disabled = true;


  try {

    if (
      typeof html2canvas === "undefined"
    ) {

      await loadCanvas();

    }


    /*
      Give the receipt images a moment
      to render before screenshotting.
    */

    await new Promise(
      resolve => setTimeout(resolve,300)
    );


    const canvas =
      await html2canvas(
        $("receiptCapture"),
        {
          backgroundColor:"#fff",
          scale:3,
          useCORS:true,
          logging:false
        }
      );


    canvas.toBlob(blob => {

      if (!blob) {
        throw new Error();
      }


      const url =
        URL.createObjectURL(blob);


      const a =
        document.createElement("a");


      a.href = url;


      a.download =
        `Laundry-Receipt-${$("receiptNumber").textContent}.png`;


      document.body.appendChild(a);

      a.click();

      a.remove();


      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );


      $("downloadMsg").textContent =
        "Receipt downloaded ✓";

      $("downloadBtn").disabled = false;

    },"image/png");


  } catch(e) {

    console.error(e);

    $("downloadMsg").textContent =
      "Download failed. Please try again.";

    $("downloadBtn").disabled = false;

  }

};


/* =========================================================
   NEW SUBMISSION
========================================================= */

$("newBtn").onclick = () => {

  items.forEach(x => {

    q[x.id] = 0;

    $("num-" + x.id).textContent = "0";

  });


  $("liveTotal").textContent = "0";

  $("error").textContent = "";

  $("downloadMsg").textContent = "";


  /*
    Clear photos.
  */

  selectedPhotos = [];

  renderPhotos();


  const receiptPhotos =
    $("receiptPhotos");

  if (receiptPhotos) {
    receiptPhotos.remove();
  }


  $("receiptScreen")
    .classList.remove("active");


  $("formScreen")
    .classList.add("active");


  scrollTo({
    top:0,
    behavior:"smooth"
  });

};


/* =========================================================
   START
========================================================= */

render();

createPhotoSection();

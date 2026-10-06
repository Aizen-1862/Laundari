/* =========================================================
   LAUNDRY — COMPLETE SCRIPT
   Items + Photos + Receipt + Download
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     ITEMS
  ======================================================= */

  const items = [
    "Shirts",
    "T-shirts",
    "Track pants",
    "Towels",
    "Underwear",
    "Pants",
    "Shorts",
    "Bedsheets",
    "Pillow covers",
    "Inner Top Wear"
  ];

  const quantities = {};

  items.forEach(item => {
    quantities[item] = 0;
  });


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const itemsGrid = document.getElementById("itemsGrid");
  const liveTotal = document.getElementById("liveTotal");

  const formScreen = document.getElementById("formScreen");
  const receiptScreen = document.getElementById("receiptScreen");

  const submitBtn = document.getElementById("submitBtn");
  const newBtn = document.getElementById("newBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const errorBox = document.getElementById("error");
  const downloadMsg = document.getElementById("downloadMsg");

  const receiptItems = document.getElementById("receiptItems");
  const receiptNumber = document.getElementById("receiptNumber");
  const receiptDate = document.getElementById("receiptDate");
  const receiptTime = document.getElementById("receiptTime");
  const totalItems = document.getElementById("totalItems");

  const photoSection = document.getElementById("photoSection");

  const cameraBtn = document.getElementById("cameraBtn");
  const galleryBtn = document.getElementById("galleryBtn");

  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");

  const photoPreview = document.getElementById("photoPreview");
  const photoCount = document.getElementById("photoCount");

  const receiptPhotos = document.getElementById("receiptPhotos");
  const receiptPhotoGrid = document.getElementById("receiptPhotoGrid");


  /* =======================================================
     PHOTOS
  ======================================================= */

  let selectedPhotos = [];

  /*
    Maximum number of photos.
    Keeping this limited prevents the phone from
    running out of memory.
  */

  const MAX_PHOTOS = 6;

  /*
    Images are resized to this maximum dimension.
  */

  const MAX_IMAGE_SIZE = 1280;

  /*
    JPEG quality.
    Smaller = less memory.
  */

  const IMAGE_QUALITY = 0.72;


  /* =======================================================
     RENDER ITEMS
  ======================================================= */

  function renderItems() {

    itemsGrid.innerHTML = "";

    items.forEach((item, index) => {

      const card = document.createElement("div");

      card.className = "item";

      card.innerHTML = `
        <span class="item-name">
          ${item}
        </span>

        <div class="controls">

          <button
            class="qty minus"
            type="button"
            aria-label="Decrease ${item}"
          >
            −
          </button>

          <span class="num">
            0
          </span>

          <button
            class="qty plus"
            type="button"
            aria-label="Increase ${item}"
          >
            +
          </button>

        </div>
      `;


      const number = card.querySelector(".num");
      const minus = card.querySelector(".minus");
      const plus = card.querySelector(".plus");


      plus.addEventListener("click", () => {

        quantities[item]++;

        number.textContent = quantities[item];

        updateTotal();

        card.classList.remove("bump");

        void card.offsetWidth;

        card.classList.add("bump");
      });


      minus.addEventListener("click", () => {

        if (quantities[item] <= 0) return;

        quantities[item]--;

        number.textContent = quantities[item];

        updateTotal();

        card.classList.remove("bump");

        void card.offsetWidth;

        card.classList.add("bump");
      });


      itemsGrid.appendChild(card);

    });

  }


  /* =======================================================
     TOTAL
  ======================================================= */

  function updateTotal() {

    let total = 0;

    items.forEach(item => {
      total += quantities[item];
    });

    liveTotal.textContent = total;

    return total;
  }


  /* =======================================================
     PHOTO BUTTONS
  ======================================================= */

  cameraBtn.addEventListener("click", () => {

    /*
      Camera input intentionally does NOT use multiple.
      Android cameras are more reliable this way.
    */

    cameraInput.click();

  });


  galleryBtn.addEventListener("click", () => {

    galleryInput.click();

  });


  cameraInput.addEventListener("change", event => {

    handleFiles(event.target.files);

    /*
      Reset input so the same photo can be selected again.
    */

    cameraInput.value = "";

  });


  galleryInput.addEventListener("change", event => {

    handleFiles(event.target.files);

    galleryInput.value = "";

  });


  /* =======================================================
     HANDLE PHOTOS
  ======================================================= */

  async function handleFiles(fileList) {

    if (!fileList || fileList.length === 0) {
      return;
    }


    if (selectedPhotos.length >= MAX_PHOTOS) {

      alert(`You can add up to ${MAX_PHOTOS} photos.`);

      return;
    }


    const files = Array.from(fileList);

    const remaining = MAX_PHOTOS - selectedPhotos.length;

    const filesToProcess = files.slice(0, remaining);


    try {

      for (const file of filesToProcess) {

        if (!file.type.startsWith("image/")) {
          continue;
        }

        const compressed = await compressImage(file);

        selectedPhotos.push(compressed);

      }


      renderPhotoPreview();

    } catch (error) {

      console.error("Photo processing error:", error);

      alert(
        "The photo could not be processed. Please try a smaller photo."
      );

    }

  }


  /* =======================================================
     COMPRESS IMAGE
  ======================================================= */

  function compressImage(file) {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();


      reader.onload = event => {

        const img = new Image();


        img.onload = () => {

          let width = img.width;
          let height = img.height;


          /*
            Resize large camera photos.
          */

          if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {

            if (width > height) {

              height =
                Math.round(
                  height * (MAX_IMAGE_SIZE / width)
                );

              width = MAX_IMAGE_SIZE;

            } else {

              width =
                Math.round(
                  width * (MAX_IMAGE_SIZE / height)
                );

              height = MAX_IMAGE_SIZE;

            }

          }


          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;


          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas unavailable"));
            return;
          }


          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );


          /*
            Convert to compressed JPEG.
          */

          const dataUrl = canvas.toDataURL(
            "image/jpeg",
            IMAGE_QUALITY
          );


          resolve(dataUrl);

        };


        img.onerror = () => {

          reject(
            new Error("Could not load image")
          );

        };


        img.src = event.target.result;

      };


      reader.onerror = () => {

        reject(
          new Error("Could not read image")
        );

      };


      reader.readAsDataURL(file);

    });

  }


  /* =======================================================
     PHOTO PREVIEW
  ======================================================= */

  function renderPhotoPreview() {

    photoPreview.innerHTML = "";

    photoCount.textContent =
      `${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"}`;


    selectedPhotos.forEach((photo, index) => {

      const box = document.createElement("div");

      box.className = "photo-preview-item";


      const image = document.createElement("img");

      image.src = photo;

      image.alt = `Laundry photo ${index + 1}`;

      image.loading = "lazy";


      const remove = document.createElement("button");

      remove.className = "remove-photo";

      remove.type = "button";

      remove.textContent = "×";

      remove.setAttribute(
        "aria-label",
        "Remove photo"
      );


      remove.addEventListener("click", () => {

        selectedPhotos.splice(index, 1);

        renderPhotoPreview();

      });


      box.appendChild(image);

      box.appendChild(remove);

      photoPreview.appendChild(box);

    });

  }


  /* =======================================================
     SUBMIT
  ======================================================= */

  submitBtn.addEventListener("click", () => {

    errorBox.textContent = "";

    const total = updateTotal();


    if (total === 0) {

      errorBox.textContent =
        "Please select at least one laundry item.";

      return;
    }


    submitBtn.disabled = true;

    submitBtn.querySelector("span").textContent =
      "Preparing Receipt...";


    setTimeout(() => {

      createReceipt(total);

      formScreen.classList.remove("active");

      receiptScreen.classList.add("active");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


      submitBtn.disabled = false;

      submitBtn.querySelector("span").textContent =
        "Submit Laundry";

    }, 350);

  });


  /* =======================================================
     CREATE RECEIPT
  ======================================================= */

  function createReceipt(total) {

    const now = new Date();


    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");


    const receiptId =
      `LD-${year}${month}${day}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;


    const dateText =
      now.toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );


    const timeText =
      now.toLocaleTimeString(
        undefined,
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    receiptNumber.textContent = receiptId;

    receiptDate.textContent = dateText;

    receiptTime.textContent = timeText;

    totalItems.textContent = total;


    receiptItems.innerHTML = "";


    items.forEach(item => {

      if (quantities[item] <= 0) {
        return;
      }


      const row = document.createElement("div");

      row.className = "row";


      row.innerHTML = `
        <span>${item}</span>
        <span>${quantities[item]}</span>
      `;


      receiptItems.appendChild(row);

    });


    createReceiptPhotos();

  }


  /* =======================================================
     RECEIPT PHOTOS
  ======================================================= */

  function createReceiptPhotos() {

    receiptPhotoGrid.innerHTML = "";


    if (selectedPhotos.length === 0) {

      receiptPhotos.classList.remove(
        "has-photos"
      );

      return;
    }


    receiptPhotos.classList.add(
      "has-photos"
    );


    selectedPhotos.forEach((photo, index) => {

      const image = document.createElement("img");

      image.src = photo;

      image.alt =
        `Laundry receipt photo ${index + 1}`;

      receiptPhotoGrid.appendChild(image);

    });

  }


  /* =======================================================
     LOAD HTML2CANVAS
  ======================================================= */

  function loadHtml2Canvas() {

    return new Promise((resolve, reject) => {

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
          new Error(
            "Could not load receipt download library."
          )
        );

      };


      document.head.appendChild(script);

    });

  }


  /* =======================================================
     DOWNLOAD RECEIPT
  ======================================================= */

  downloadBtn.addEventListener("click", async () => {

    downloadMsg.textContent =
      "Preparing your receipt...";


    downloadBtn.disabled = true;


    try {

      const html2canvas =
        await loadHtml2Canvas();


      const receipt =
        document.getElementById(
          "receiptCapture"
        );


      /*
        Lower scale = much less memory usage.
        2 is still sharp on phones.
      */

      const canvas =
        await html2canvas(
          receipt,
          {
            scale: 2,

            backgroundColor: "#ffffff",

            useCORS: true,

            logging: false
          }
        );


      canvas.toBlob(
        blob => {

          if (!blob) {

            downloadMsg.textContent =
              "Could not create the receipt image.";

            downloadBtn.disabled = false;

            return;
          }


          const url =
            URL.createObjectURL(blob);


          const link =
            document.createElement("a");


          link.href = url;


          const number =
            receiptNumber.textContent
              .replace(/[^a-zA-Z0-9-]/g, "");


          link.download =
            `Laundry-Receipt-${number}.png`;


          document.body.appendChild(link);

          link.click();

          link.remove();


          setTimeout(() => {

            URL.revokeObjectURL(url);

          }, 1000);


          downloadMsg.textContent =
            "✓ Receipt saved successfully!";

          downloadBtn.disabled = false;

        },

        "image/png"
      );


    } catch (error) {

      console.error(
        "Receipt download error:",
        error
      );


      downloadMsg.textContent =
        "Could not download receipt. Please try again.";


      downloadBtn.disabled = false;

    }

  });


  /* =======================================================
     NEW SUBMISSION
  ======================================================= */

  newBtn.addEventListener("click", () => {

    items.forEach(item => {

      quantities[item] = 0;

    });


    selectedPhotos = [];


    receiptPhotoGrid.innerHTML = "";

    receiptPhotos.classList.remove(
      "has-photos"
    );


    renderItems();

    updateTotal();

    renderPhotoPreview();


    errorBox.textContent = "";

    downloadMsg.textContent = "";


    receiptScreen.classList.remove(
      "active"
    );

    formScreen.classList.add(
      "active"
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  });


  /* =======================================================
     START
  ======================================================= */

  renderItems();

  updateTotal();

  renderPhotoPreview();

});

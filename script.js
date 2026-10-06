/* =========================================================
   LAUNDRY
   COMPLETE CLEAN SCRIPT
   NO PHOTO SECTION CREATION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

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

  items.forEach(function (item) {
    quantities[item] = 0;
  });


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const itemsGrid =
    document.getElementById("itemsGrid");

  const liveTotal =
    document.getElementById("liveTotal");

  const formScreen =
    document.getElementById("formScreen");

  const receiptScreen =
    document.getElementById("receiptScreen");

  const submitBtn =
    document.getElementById("submitBtn");

  const newBtn =
    document.getElementById("newBtn");

  const downloadBtn =
    document.getElementById("downloadBtn");

  const errorBox =
    document.getElementById("error");

  const downloadMsg =
    document.getElementById("downloadMsg");

  const receiptItems =
    document.getElementById("receiptItems");

  const receiptNumber =
    document.getElementById("receiptNumber");

  const receiptDate =
    document.getElementById("receiptDate");

  const receiptTime =
    document.getElementById("receiptTime");

  const totalItems =
    document.getElementById("totalItems");

  const cameraBtn =
    document.getElementById("cameraBtn");

  const galleryBtn =
    document.getElementById("galleryBtn");

  const cameraInput =
    document.getElementById("cameraInput");

  const galleryInput =
    document.getElementById("galleryInput");

  const photoPreview =
    document.getElementById("photoPreview");

  const photoCount =
    document.getElementById("photoCount");

  const receiptPhotos =
    document.getElementById("receiptPhotos");

  const receiptPhotoGrid =
    document.getElementById("receiptPhotoGrid");


  /* =======================================================
     PHOTO SETTINGS
  ======================================================= */

  const MAX_PHOTOS = 6;

  const MAX_IMAGE_SIZE = 1000;

  const IMAGE_QUALITY = 0.65;


  let selectedPhotos = [];


  /* =======================================================
     RENDER ITEMS
  ======================================================= */

  function renderItems() {

    itemsGrid.innerHTML = "";


    items.forEach(function (item) {

      const card =
        document.createElement("div");

      card.className = "item";


      const name =
        document.createElement("span");

      name.className = "item-name";

      name.textContent = item;


      const controls =
        document.createElement("div");

      controls.className = "controls";


      const minus =
        document.createElement("button");

      minus.className = "qty";

      minus.type = "button";

      minus.textContent = "−";


      const number =
        document.createElement("span");

      number.className = "num";

      number.textContent =
        quantities[item];


      const plus =
        document.createElement("button");

      plus.className = "qty";

      plus.type = "button";

      plus.textContent = "+";


      controls.appendChild(minus);

      controls.appendChild(number);

      controls.appendChild(plus);


      card.appendChild(name);

      card.appendChild(controls);


      plus.addEventListener(
        "click",
        function () {

          quantities[item]++;

          number.textContent =
            quantities[item];

          updateTotal();

          card.classList.remove("bump");

          void card.offsetWidth;

          card.classList.add("bump");

        }
      );


      minus.addEventListener(
        "click",
        function () {

          if (quantities[item] <= 0) {
            return;
          }

          quantities[item]--;

          number.textContent =
            quantities[item];

          updateTotal();

          card.classList.remove("bump");

          void card.offsetWidth;

          card.classList.add("bump");

        }
      );


      itemsGrid.appendChild(card);

    });

  }


  /* =======================================================
     TOTAL
  ======================================================= */

  function updateTotal() {

    let total = 0;


    items.forEach(function (item) {

      total += quantities[item];

    });


    liveTotal.textContent = total;


    return total;

  }


  /* =======================================================
     CAMERA
  ======================================================= */

  cameraBtn.addEventListener(
    "click",
    function () {

      /*
        Only ONE photo is requested from
        the camera at a time.
      */

      cameraInput.value = "";

      cameraInput.click();

    }
  );


  /* =======================================================
     GALLERY
  ======================================================= */

  galleryBtn.addEventListener(
    "click",
    function () {

      galleryInput.value = "";

      galleryInput.click();

    }
  );


  /* =======================================================
     CAMERA FILE
  ======================================================= */

  cameraInput.addEventListener(
    "change",
    function (event) {

      if (!event.target.files) {
        return;
      }

      handleFiles(
        Array.from(event.target.files)
      );

    }
  );


  /* =======================================================
     GALLERY FILES
  ======================================================= */

  galleryInput.addEventListener(
    "change",
    function (event) {

      if (!event.target.files) {
        return;
      }

      handleFiles(
        Array.from(event.target.files)
      );

    }
  );


  /* =======================================================
     HANDLE FILES
  ======================================================= */

  async function handleFiles(files) {

    if (!files || files.length === 0) {
      return;
    }


    const remaining =
      MAX_PHOTOS - selectedPhotos.length;


    if (remaining <= 0) {

      alert(
        "You can add up to 6 photos."
      );

      return;

    }


    const filesToProcess =
      files.slice(0, remaining);


    try {

      for (
        let i = 0;
        i < filesToProcess.length;
        i++
      ) {

        const file =
          filesToProcess[i];


        if (
          !file.type ||
          !file.type.startsWith("image/")
        ) {
          continue;
        }


        /*
          Compress immediately so we don't keep
          huge camera files in memory.
        */

        const compressed =
          await compressImage(file);


        selectedPhotos.push(
          compressed
        );

      }


      renderPhotoPreview();


    } catch (error) {

      console.error(
        "Photo error:",
        error
      );


      alert(
        "Could not process this photo. Please try again."
      );

    }

  }


  /* =======================================================
     COMPRESS IMAGE
  ======================================================= */

  function compressImage(file) {

    return new Promise(
      function (resolve, reject) {

        const reader =
          new FileReader();


        reader.onload =
          function (event) {

            const image =
              new Image();


            image.onload =
              function () {

                let width =
                  image.naturalWidth;

                let height =
                  image.naturalHeight;


                /*
                  Resize large images.
                */

                if (
                  width > MAX_IMAGE_SIZE ||
                  height > MAX_IMAGE_SIZE
                ) {

                  if (width >= height) {

                    height =
                      Math.round(
                        height *
                        (MAX_IMAGE_SIZE / width)
                      );

                    width =
                      MAX_IMAGE_SIZE;

                  } else {

                    width =
                      Math.round(
                        width *
                        (MAX_IMAGE_SIZE / height)
                      );

                    height =
                      MAX_IMAGE_SIZE;

                  }

                }


                const canvas =
                  document.createElement(
                    "canvas"
                  );


                canvas.width = width;

                canvas.height = height;


                const context =
                  canvas.getContext("2d");


                if (!context) {

                  reject(
                    new Error(
                      "Canvas unavailable"
                    )
                  );

                  return;

                }


                context.drawImage(
                  image,
                  0,
                  0,
                  width,
                  height
                );


                /*
                  JPEG is much smaller than
                  the original camera image.
                */

                const compressed =
                  canvas.toDataURL(
                    "image/jpeg",
                    IMAGE_QUALITY
                  );


                resolve(compressed);


                /*
                  Release canvas memory.
                */

                canvas.width = 1;

                canvas.height = 1;

              };


            image.onerror =
              function () {

                reject(
                  new Error(
                    "Image could not be loaded"
                  )
                );

              };


            image.src =
              event.target.result;

          };


        reader.onerror =
          function () {

            reject(
              new Error(
                "File could not be read"
              )
            );

          };


        reader.readAsDataURL(file);

      }
    );

  }


  /* =======================================================
     PHOTO PREVIEW
  ======================================================= */

  function renderPhotoPreview() {

    photoPreview.innerHTML = "";


    const count =
      selectedPhotos.length;


    photoCount.textContent =
      count === 1
        ? "1 photo"
        : count + " photos";


    selectedPhotos.forEach(
      function (photo, index) {

        const box =
          document.createElement("div");

        box.className =
          "photo-preview-item";


        const image =
          document.createElement("img");

        image.src = photo;

        image.alt =
          "Laundry photo " + (index + 1);


        const remove =
          document.createElement("button");

        remove.className =
          "remove-photo";

        remove.type = "button";

        remove.textContent = "×";


        remove.addEventListener(
          "click",
          function () {

            selectedPhotos.splice(
              index,
              1
            );

            renderPhotoPreview();

          }
        );


        box.appendChild(image);

        box.appendChild(remove);

        photoPreview.appendChild(box);

      }
    );

  }


  /* =======================================================
     SUBMIT
  ======================================================= */

  submitBtn.addEventListener(
    "click",
    function () {

      errorBox.textContent = "";


      const total =
        updateTotal();


      if (total === 0) {

        errorBox.textContent =
          "Please select at least one laundry item.";

        return;

      }


      submitBtn.disabled = true;


      submitBtn.querySelector(
        "span"
      ).textContent =
        "Preparing Receipt...";


      setTimeout(
        function () {

          createReceipt(total);


          formScreen.classList.remove(
            "active"
          );

          receiptScreen.classList.add(
            "active"
          );


          window.scrollTo(
            0,
            0
          );


          submitBtn.disabled = false;


          submitBtn.querySelector(
            "span"
          ).textContent =
            "Submit Laundry";

        },
        300
      );

    }
  );


  /* =======================================================
     CREATE RECEIPT
  ======================================================= */

  function createReceipt(total) {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");


    const day =
      String(
        now.getDate()
      ).padStart(2, "0");


    const randomNumber =
      Math.floor(
        1000 +
        Math.random() * 9000
      );


    const id =
      "LD-" +
      year +
      month +
      day +
      "-" +
      randomNumber;


    const date =
      now.toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );


    const time =
      now.toLocaleTimeString(
        undefined,
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    receiptNumber.textContent =
      id;

    receiptDate.textContent =
      date;

    receiptTime.textContent =
      time;

    totalItems.textContent =
      total;


    receiptItems.innerHTML = "";


    items.forEach(
      function (item) {

        if (quantities[item] <= 0) {
          return;
        }


        const row =
          document.createElement("div");

        row.className =
          "receipt-row";


        const name =
          document.createElement("span");

        name.textContent =
          item;


        const qty =
          document.createElement("span");

        qty.textContent =
          quantities[item];


        row.appendChild(name);

        row.appendChild(qty);


        receiptItems.appendChild(row);

      }
    );


    createReceiptPhotos();

  }


  /* =======================================================
     RECEIPT PHOTOS
  ======================================================= */

  function createReceiptPhotos() {

    receiptPhotoGrid.innerHTML = "";


    if (
      selectedPhotos.length === 0
    ) {

      receiptPhotos.classList.remove(
        "has-photos"
      );

      return;

    }


    receiptPhotos.classList.add(
      "has-photos"
    );


    selectedPhotos.forEach(
      function (photo, index) {

        const image =
          document.createElement("img");


        image.src =
          photo;


        image.alt =
          "Receipt photo " +
          (index + 1);


        receiptPhotoGrid.appendChild(
          image
        );

      }
    );

  }


  /* =======================================================
     LOAD HTML2CANVAS
  ======================================================= */

  function loadHtml2Canvas() {

    return new Promise(
      function (resolve, reject) {

        if (window.html2canvas) {

          resolve(
            window.html2canvas
          );

          return;

        }


        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";


        script.onload =
          function () {

            resolve(
              window.html2canvas
            );

          };


        script.onerror =
          function () {

            reject(
              new Error(
                "Receipt download library failed"
              )
            );

          };


        document.head.appendChild(
          script
        );

      }
    );

  }


  /* =======================================================
     DOWNLOAD RECEIPT
  ======================================================= */

  downloadBtn.addEventListener(
    "click",
    async function () {

      downloadMsg.textContent =
        "Preparing receipt...";


      downloadBtn.disabled = true;


      try {

        const html2canvas =
          await loadHtml2Canvas();


        const receipt =
          document.getElementById(
            "receiptCapture"
          );


        /*
          Scale 1.5 keeps memory usage
          much lower on phones.
        */

        const canvas =
          await html2canvas(
            receipt,
            {
              scale: 1.5,

              backgroundColor:
                "#ffffff",

              useCORS: true,

              logging: false
            }
          );


        canvas.toBlob(
          function (blob) {

            if (!blob) {

              downloadMsg.textContent =
                "Could not create receipt image.";

              downloadBtn.disabled =
                false;

              return;

            }


            const url =
              URL.createObjectURL(blob);


            const link =
              document.createElement(
                "a"
              );


            link.href =
              url;


            const cleanNumber =
              receiptNumber.textContent
                .replace(
                  /[^a-zA-Z0-9-]/g,
                  ""
                );


            link.download =
              "Laundry-Receipt-" +
              cleanNumber +
              ".png";


            document.body.appendChild(
              link
            );


            link.click();


            link.remove();


            setTimeout(
              function () {

                URL.revokeObjectURL(
                  url
                );

              },
              1000
            );


            downloadMsg.textContent =
              "✓ Receipt saved successfully!";


            downloadBtn.disabled =
              false;


            /*
              Free the canvas memory.
            */

            canvas.width = 1;

            canvas.height = 1;

          },
          "image/png"
        );


      } catch (error) {

        console.error(
          "Download error:",
          error
        );


        downloadMsg.textContent =
          "Could not download receipt. Please try again.";


        downloadBtn.disabled =
          false;

      }

    }
  );


  /* =======================================================
     NEW SUBMISSION
  ======================================================= */

  newBtn.addEventListener(
    "click",
    function () {

      items.forEach(
        function (item) {

          quantities[item] = 0;

        }
      );


      selectedPhotos = [];


      receiptPhotoGrid.innerHTML =
        "";


      receiptPhotos.classList.remove(
        "has-photos"
      );


      renderItems();

      updateTotal();

      renderPhotoPreview();


      errorBox.textContent =
        "";

      downloadMsg.textContent =
        "";


      receiptScreen.classList.remove(
        "active"
      );

      formScreen.classList.add(
        "active"
      );


      window.scrollTo(
        0,
        0
      );

    }
  );


  /* =======================================================
     START APP
  ======================================================= */

  renderItems();

  updateTotal();

  renderPhotoPreview();

});

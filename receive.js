// receive.js

const receiveBtn = document.getElementById("receiveBtn");
const receiveLink = document.getElementById("receiveLink");
const progressContainer = document.getElementById("receiveProgress");
const downloadContainer = document.getElementById("downloadContainer");
const scanBtn = document.getElementById("scanBtn");
const readerContainer = document.getElementById("reader");
const BACKEND_URL = "https://swiftshare-backend-jxag.onrender.com";
const messageContainer = document.getElementById("messageContainer");

let html5QrCode = null;
let scanning = false;

// Handle Receive Button Click
receiveBtn.addEventListener("click", () => {
    const link = receiveLink.value.trim();
    if (!link) {
        showMessage("Please paste a valid link or scan a QR code.", true); // 🆕 Replaced alert()
        return;
    }

    processDownloadLink(link);
});

// ----------------------------------------------------
// 🆕 NEW: Core logic to process the download link
// ----------------------------------------------------
async function processDownloadLink(link) {
    // Clear previous results and disable button
    downloadContainer.innerHTML = "";
    progressContainer.style.display = "none";
    receiveBtn.disabled = true;

    try {
        const url = new URL(link);
        const pathname = url.pathname;

        let isGroupDownload = pathname.startsWith("/download-group/");
        let isSingleFileDownload = pathname.startsWith("/download-file/");
        let fileInfo = null;

        if (!isGroupDownload && !isSingleFileDownload) {
            throw new Error("Invalid SwiftShare link format.");
        }

        // --- 1. Handle Group Download (Fetch metadata from the new API route) ---
        if (isGroupDownload) {
            const parts = pathname.split("/");
            const groupId = parts[parts.length - 1]; // Get the Group ID

            const res = await fetch(`${BACKEND_URL}/group-info/${groupId}`);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "File group not found.");
            }

            fileInfo = await res.json(); // Contains type: 'group', files: [], download_link
        }

        // --- 2. Handle Single File Download (Extract info from the link) ---
        else if (isSingleFileDownload) {
            const parts = pathname.split("/");
            const filenameWithId = parts[parts.length - 1];

            // Extract original name (everything after the first hyphen)
            const originalName = filenameWithId.split("-").slice(1).join("-");

            fileInfo = {
                type: "single",
                files: [{ name: originalName }],
                download_link: link,
            };
        }

        // --- 3. Display Results ---
        showReceivedFiles(fileInfo);
    } catch (error) {
        console.error("❌ Link processing error:", error);
        downloadContainer.innerHTML = `<p style="color:red; text-align:center;">
            Error: ${error.message || "Could not process link."}
        </p>`;
    } finally {
        receiveBtn.disabled = false;
    }
}

// ----------------------------------------------------
// 🆕 MODIFIED: Display function
// ----------------------------------------------------
function showReceivedFiles(fileInfo) {
    if (!fileInfo || !fileInfo.files.length) {
        downloadContainer.innerHTML =
            '<p style="color:red; text-align:center;">No files found for this link.</p>';
        return;
    }

    const isGroup = fileInfo.type === "group";
    const fileCount = fileInfo.files.length;

    // Create list of files
    const fileListHTML = fileInfo.files
        .map(
            (file) => `
        <div class="file">
            <span>${file.name}</span>
        </div>
    `
        )
        .join("");

    // Create the main download button
    downloadContainer.innerHTML = `
        <h3>Ready to Download</h3>
        <p class="subtitle">
            ${
              isGroup
                ? `Contents of ZIP file (${fileCount} files):`
                : "One file ready for download:"
            }
        </p>
        <div class="download-container">
            ${fileListHTML}
            <button class="btn1" id="clear">Clear</button>
        </div>
        
        <div class='download_cont' style="margin-top: 25px; text-align: center;">
            <a href="${
              fileInfo.download_link
            }" class=" download-btn" target="_blank">
                 Download ${isGroup ? `All (${fileCount} files)` : ""}
            </a>
        </div>
    `;

  // Clear the progress bar, which is no longer needed
  progressContainer.style.display = "none";
}

// ----------------------------------------------------
// ⚠️ IMPORTANT: Keep the QR scanning logic as is
// ----------------------------------------------------
// Handle QR Scan
scanBtn.addEventListener("click", () => {
  if (scanning) {
    stopScanner();
  } else {
    startScanner();
  }
});

function startScanner() {
  readerContainer.style.display = "block";
  scanning = true;
  scanBtn.textContent = "Stop Scanning";

  html5QrCode = new Html5Qrcode("reader");

  html5QrCode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        receiveLink.value = decodedText;
        stopScanner();
        // 🆕 Auto-process after successful scan
        processDownloadLink(decodedText);
      },
      (errorMessage) => {
        // Optional: console.log("Scanning...", errorMessage);
      }
    )
    .catch((err) => {
      console.error("Camera error:", err);
      stopScanner();
    });
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode
      .stop()
      .then(() => {
        console.log("QR scanning stopped.");
        scanning = false;
        readerContainer.style.display = "none";
        scanBtn.textContent = "Scan QR Code";
      })
      .catch((err) => {
        console.error("Error stopping scanner:", err);
      });
  } else {
    scanning = false;
    readerContainer.style.display = "none";
    scanBtn.textContent = "Scan QR Code";
  }
}

document.body.addEventListener("click", function (e) {
  if (e.target && e.target.id === "clear") {
    downloadContainer.innerHTML = "";
    receiveLink.value = "";
  }
});

function showMessage(message, isError = true) {
  // Hide download/progress on new message
  progressContainer.style.display = "none";
  downloadContainer.innerHTML = "";

  // Set style based on error/info
  const bgColor = isError ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 198, 255, 0.2)";
  const color = isError ? "#ffcccc" : "#cceeff";

  messageContainer.style.display = "block";
  messageContainer.innerHTML = `
        <p style="color: ${color}; padding: 10px; border-radius: 8px; background: ${bgColor}; font-size: 1rem; margin-bottom: 15px;">
            ${message}
        </p>
        <button class="btn1" id="clearMessage">Clear</button>
    `;
  receiveBtn.disabled = false;
}

// Global click handler for clearing messages/results
document.body.addEventListener("click", function (e) {
  if (e.target && e.target.id === "clearMessage") {
    messageContainer.style.display = "none";
    messageContainer.innerHTML = "";
    receiveBtn.disabled = false;
  }
});
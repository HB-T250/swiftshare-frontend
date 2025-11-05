// send.js (REPLACE existing top variables)

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const clearAll = document.getElementById("clearAll");
const sendBtn = document.getElementById("sendBtn");
const resultContainer = document.getElementById("resultContainer");

// 🆕 NEW PROGRESS BAR ELEMENTS
const progressContainer = document.getElementById("uploadProgressContainer");
const progressBar = document.getElementById("uploadProgressBar");
const progressText = document.getElementById("uploadProgressText");

let files = [];
let selectMode = false;

function uploadFilesWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = "https://swiftshare-backend-jxag.onrender.com/upload";

        xhr.open("POST", url);

        // 1. Set up the progress event listener (for tracking upload)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + "%";
                progressText.textContent = `Uploading... ${percentComplete}%`;
            }
        };

        // 2. Set up the load (completion) event listener
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Success: Resolve the promise with the server's JSON response
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data);
                } catch (e) {
                    reject(new Error("Server response was not valid JSON."));
                }
            } else {
                // Failure: Reject the promise with an error message
                let errorDetails = xhr.responseText;
                try {
                    const errorJson = JSON.parse(errorDetails);
                    errorDetails = errorJson.error || errorJson.details || errorDetails;
                } catch (e) {}
                reject(
                    new Error(`Upload failed with status ${xhr.status}: ${errorDetails}`)
                );
            }
        };

        // 3. Set up the error listener
        xhr.onerror = () => {
            reject(new Error("Network error or connection refused."));
        };

        // 4. Send the data
        xhr.send(formData);
    });
}

// ... (Rest of your event listeners and functions)
// Handle click to select
dropArea.addEventListener("click", (e) => {
    E.preventDefault();
    e.stopPropagation();
    if(!fileInput.dataset.open) {
        fileInput.dataset.open = "true";
        fileInput.click();

        setTimeout(() => {
            delete fileInput.dataset.open;
        }, 1000);
    }
});

// Drag & drop
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () =>
    dropArea.classList.remove("dragover")
);
dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => {
    if(e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// Handle multiple files
function handleFiles(selectedFiles) {
    if (!selectedFiles.length) return;

    const newFiles = Array.from(selectedFiles);
    if (files.length + newFiles.length > 4) {
        alert("You can upload a maximum of 4 files.");
        return;
    }

    newFiles.forEach((file) => {
        files.push(file);
        displayFile(file);
    });
}

// Display file
function displayFile(file) {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    const info = document.createElement("div");
    info.className = "file-info";
    info.innerHTML = `
        <div class="file-name">${file.name}</div>
        <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
      `;

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const done = document.createElement("span");
    done.className = "done-badge";
    done.textContent = "Done";
    actions.appendChild(done);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "btn1";
    removeBtn.style.display = "none";
    removeBtn.onclick = () => removeFile(file, fileItem);
    actions.appendChild(removeBtn);

    fileItem.append(info, actions);
    fileList.appendChild(fileItem);

    // Show "Done" badge briefly
    setTimeout(() => {
        done.remove();
        removeBtn.style.display = "inline-block";
    }, 1500);
}

// Remove file
function removeFile(file, element) {
    files = files.filter((f) => f !== file);
    element.remove();
}

// Clear all
clearAll.addEventListener("click", () => {
    files = [];
    fileList.innerHTML = "";
});

// Toggle select mode and send selected files
sendBtn.addEventListener("click", () => {
    if (!selectMode) {
        if (!files.length) {
            alert("Please upload files first!");
            return;
        }
        selectMode = true;
        sendBtn.textContent = "Confirm Send";
        fileList.querySelectorAll(".file-item").forEach((item) => {
            item.onclick = () => {
                if (sendBtn.textContent === "Confirm Send") {
                    toggleSelect(item);
                } else {
                    return;
                }
            };
        });
    } else {
        sendSelectedFiles();
    }
});

function toggleSelect(item) {
    if (sendBtn.textContent !== "Confirm Send") return;
    item.classList.toggle("selected");
    const selectedCount = document.querySelectorAll(".file-item.selected").length;
    if (selectedCount > 4) {
        item.classList.remove("selected");
        alert("You can select up to 4 files only.");
    }

    if (selectedCount === 0) {
        sendBtn.textContent = "Send";
        selectMode = false;
    }
}

// send.js (REPLACE your existing sendSelectedFiles function)

async function sendSelectedFiles() {
    const selected = document.querySelectorAll(".file-item.selected");
    if (selected.length === 0) {
        alert("Please select at least one file to send!");
        return;
    }
    // Changed this from > 2 to > 5 based on HTML hint, but server limits to 2
    if (selected.length > 4) {
        alert("You can only send up to 2 files at a time!");
        return;
    }

    sendBtn.textContent = "Uploading...";
    sendBtn.disabled = true; // Disable button during upload
    resultContainer.style.display = "none"; // 🆕 Hide result area during upload

    // 🆕 SHOW PROGRESS BAR
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "Uploading... 0%";

    const selectedFileNames = Array.from(selected).map(
        (item) => item.querySelector(".file-name").textContent
    );
    const selectedFiles = files.filter((f) => selectedFileNames.includes(f.name));

    // 🚀 Create a single FormData object and append ALL files
    const formData = new FormData();
    selectedFiles.forEach((file) => {
        formData.append("files", file);
    });

    try {
        // 🚀 NEW: Call the XHR function instead of fetch
        const data = await uploadFilesWithProgress(formData);

        // 🆕 HIDE PROGRESS BAR
        progressContainer.style.display = "none";

        // 🟢 Show the single result (link and QR code)
        // ... (rest of your successful result rendering logic)

        resultContainer.style.display = "block"; // Show result container now
        const resultHTML = `
            <div class="result-item">
                <p>Files Sent: <strong>${data.file_count}</strong></p>
                <p>Link Type: <strong>${
                  data.file_count > 1 ? "ZIP Group" : "Direct File"
                }</strong></p>
                <a href="${data.download_link}" target="_blank">${
      data.download_link
    }</a>
                <br>
                <div style="margin: 15px auto;">
                    <canvas id="qrCanvasResult"></canvas> 
                </div>
            </div>
        `;

        resultContainer.innerHTML = `
            <h3>Files Processed Successfully</h3>
            ${resultHTML}
            <button class="btn1" id="clearResult">Clear Result</button>
        `;

        // Generate QR code using the link we got from the server
        const qrCanvas = document.getElementById("qrCanvasResult");
        if (qrCanvas) {
            // Use the download_link to generate the QR code
            QRCode.toCanvas(qrCanvas, data.download_link, {
                errorCorrectionLevel: "H",
                width: 150,
            });
        }

        // Reset state
        sendBtn.textContent = "Send";
        sendBtn.disabled = false;
        selectMode = false;
        document
            .querySelectorAll(".file-item.selected")
            .forEach((item) => item.classList.remove("selected"));
    } catch (error) {
        // 🆕 HIDE PROGRESS BAR on error
        progressContainer.style.display = "none";
        resultContainer.style.display = "block";

        console.error("❌ Upload error:", error);
        alert(`Error uploading files: ${error.message}`);
        resultContainer.innerHTML = `<p style="color:red;">Upload failed: ${
      error.message || "Unknown error"
    }</p>`;
        sendBtn.textContent = "Send";
        sendBtn.disabled = false;
    }
}
document.body.addEventListener("click", function(e) {
    if (e.target && e.target.id === "clearResult") {
        // Hide result area
        resultContainer.style.display = "none";

        // ✅ Define fileLink and qrCanvas here
        const fileLink = document.querySelector(".result-item a");
        const qrCanvas = document.getElementById("qrCanvasResult");

        // Clear link and QR
        if (fileLink) {
            fileLink.textContent = "";
            fileLink.href = "#";
        }

        if (qrCanvas) {
            const ctx = qrCanvas.getContext("2d");
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        }

        // Reset selection state (but keep uploaded files)
        selectMode = false;

        // Remove any visual "selected" styles
        document.querySelectorAll(".file-item.selected").forEach((item) => {
            item.classList.remove("selected");
        });

        // Re-enable the Send button and reset its text
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";

        alert("Link and QR cleared. You can now send again.");
    }

});


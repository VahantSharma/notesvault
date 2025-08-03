// NotesVault Upload System with Authentication
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication on load
  const currentUser = window.authService.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Display user info in upload form
  displayUserInfo(currentUser);
});

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");

// Display user information
function displayUserInfo(user) {
  const userInfoSection = document.querySelector(".user-info");
  if (userInfoSection) {
    userInfoSection.innerHTML = `
      <p><strong>Uploading as:</strong> ${user.name} (${user.email})</p>
      <p><strong>Branch:</strong> ${user.branch || "Not specified"}</p>
    `;
  }
}

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    handleFile(fileInput.files[0]);
  }
});

["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

["dragenter", "dragover"].forEach((event) => {
  dropZone.addEventListener(event, () => {
    dropZone.classList.add("bg-blue-50", "border-blue-400", "text-blue-500");
  });
});

["dragleave", "drop"].forEach((event) => {
  dropZone.addEventListener(event, () => {
    dropZone.classList.remove("bg-blue-50", "border-blue-400", "text-blue-500");
  });
});

dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length) {
    handleFile(files[0]);
  }
});

function handleFile(file) {
  preview.innerHTML = `<p class="font-medium">Selected: ${file.name}</p>`;

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      img.classList.add(
        "mt-2",
        "mx-auto",
        "max-w-[200px]",
        "rounded-md",
        "shadow"
      );
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

// Handle form submission
document.addEventListener("submit", function (e) {
  if (e.target.id === "uploadForm") {
    e.preventDefault();
    handleUpload(e.target);
  }
});

async function handleUpload(form) {
  const currentUser = window.authService.getCurrentUser();
  if (!currentUser) {
    alert("Please login to upload notes");
    return;
  }

  const formData = new FormData(form);
  const file = formData.get("file");
  const title = formData.get("title");
  const subject = formData.get("subject");
  const semester = formData.get("semester");
  const noteType = formData.get("noteType");

  if (!file || !title || !subject || !semester || !noteType) {
    alert("Please fill in all required fields and select a file");
    return;
  }

  try {
    // Simulate file upload (in a real app, this would upload to a server)
    const noteData = {
      id: Date.now().toString(),
      title: title,
      subject: subject,
      semester: semester,
      type: noteType,
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: currentUser.id,
      uploaderName: currentUser.name,
      uploadedAt: new Date().toISOString(),
      // In a real app, this would be a server URL
      url: URL.createObjectURL(file),
    };

    // Add to user's notes
    await addNoteToUser(noteData, noteType);

    // Show success message
    showUploadSuccess(noteData);

    // Reset form
    form.reset();
    preview.innerHTML = "";
  } catch (error) {
    console.error("Upload error:", error);
    alert("Upload failed. Please try again.");
  }
}

async function addNoteToUser(noteData, noteType) {
  const currentUser = window.authService.getCurrentUser();
  const users = JSON.parse(localStorage.getItem("notesvault_users") || "[]");
  const userIndex = users.findIndex((u) => u.id === currentUser.id);

  if (userIndex !== -1) {
    if (!users[userIndex].notes) {
      users[userIndex].notes = { lectures: [], pyqs: [] };
    }

    if (noteType === "lecture") {
      users[userIndex].notes.lectures.push(noteData.title);
    } else if (noteType === "pyq") {
      users[userIndex].notes.pyqs.push(noteData.title);
    }

    localStorage.setItem("notesvault_users", JSON.stringify(users));
  }
}

function showUploadSuccess(noteData) {
  const successMsg = document.createElement("div");
  successMsg.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50";
  successMsg.innerHTML = `
    <h4 class="font-bold">Upload Successful!</h4>
    <p>${noteData.title} has been uploaded successfully.</p>
    <div class="mt-2">
      <button onclick="window.location.href='studentAccount.html'" class="bg-white text-green-500 px-3 py-1 rounded text-sm mr-2">View My Notes</button>
      <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-3 py-1 rounded text-sm">Close</button>
    </div>
  `;

  document.body.appendChild(successMsg);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (successMsg.parentElement) {
      successMsg.remove();
    }
  }, 5000);
}

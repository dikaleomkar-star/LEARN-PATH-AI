
// ==========================================
// LearnPath AI - Frontend Application
// ==========================================

const API = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8001"
  : "https://learn-path-ai-backend.vercel.app";
const USER_KEY = "learnpath_user";

// ==========================================
// DOM ELEMENTS
// ==========================================

const authSection = document.querySelector("#auth");
const studioSection = document.querySelector("#studio");

const authForm = document.querySelector("#auth-form");
const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#name");

const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");

const showLogin = document.querySelector("#show-login");
const showSignup = document.querySelector("#show-signup");

const logoutButton = document.querySelector("#logout");

const hello = document.querySelector("#hello");

const askForm = document.querySelector("#ask-form");
const topicInput = document.querySelector("#topic");
const askSubmit = document.querySelector("#ask-submit");

const statusLine = document.querySelector("#status");
const pathArticle = document.querySelector("#path");

const downloadControls = document.querySelector("#download-controls");

const downloadTxt = document.querySelector("#download-txt");
const downloadMd = document.querySelector("#download-md");
const downloadPdf = document.querySelector("#download-pdf");

// ==========================================
// APPLICATION STATE
// ==========================================

let mode = "login";

let isAuthenticating = false;
let isGenerating = false;

let lastRoadmapText = "";


// ==========================================
// SESSION MANAGEMENT
// ==========================================

function currentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);

    return raw ? JSON.parse(raw) : null;

  } catch (error) {

    console.error("Session error:", error);

    sessionStorage.removeItem(USER_KEY);

    return null;
  }
}


// ==========================================
// SHOW STUDIO
// ==========================================

function showStudio(user) {

  if (!user || !user.id) {

    showAuth();

    return;
  }

  authSection.hidden = true;

  studioSection.hidden = false;

  logoutButton.hidden = false;

  hello.textContent =
    `Signed in as ${user.name || user.email || "User"}`;

  downloadControls.hidden = true;

  topicInput.focus();
}


// ==========================================
// SHOW AUTHENTICATION
// ==========================================

function showAuth() {

  studioSection.hidden = true;

  authSection.hidden = false;

  logoutButton.hidden = true;

  pathArticle.hidden = true;

  pathArticle.replaceChildren();

  statusLine.textContent = "";

  downloadControls.hidden = true;

  isGenerating = false;

  askSubmit.disabled = false;

  askSubmit.textContent = "Map the path";
}


// ==========================================
// LOGIN / SIGNUP MODE
// ==========================================

function setMode(nextMode) {

  mode = nextMode === "signup" ? "signup" : "login";

  const signingUp = mode === "signup";

  showLogin.classList.toggle("is-on", !signingUp);

  showSignup.classList.toggle("is-on", signingUp);

  showLogin.setAttribute(
    "aria-selected",
    String(!signingUp)
  );

  showSignup.setAttribute(
    "aria-selected",
    String(signingUp)
  );

  nameField.hidden = !signingUp;

  nameInput.required = signingUp;

  if (!signingUp) {
    nameInput.value = "";
  }

  authSubmit.textContent =
    signingUp ? "Create account" : "Log in";

  passwordInput.autocomplete =
    signingUp ? "new-password" : "current-password";

  authError.textContent = "";
}


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}


// ==========================================
// ROADMAP TEXT FORMATTING
// ==========================================

function inlineFormat(value) {

  return escapeHtml(value)

    .replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    )

    .replace(
      /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
      "$1<em>$2</em>"
    )

    .replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );
}


function renderPath(roadmapText) {

  const lines = String(roadmapText)
    .replaceAll("\r\n", "\n")
    .split("\n");

  const html = [];

  let listType = null;


  function closeList() {

    if (listType) {

      html.push(
        listType === "ol" ? "</ol>" : "</ul>"
      );

      listType = null;
    }
  }


  for (const line of lines) {

    const trimmed = line.trim();

    if (!trimmed) {

      closeList();

      continue;
    }


    if (trimmed === "---") {

      closeList();

      html.push("<hr>");

      continue;
    }


    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);

    if (heading) {

      closeList();

      const level = Math.min(
        heading[1].length + 1,
        3
      );

      html.push(
        `<h${level}>${inlineFormat(heading[2])}</h${level}>`
      );

      continue;
    }


    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);

    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);


    if (bullet || numbered) {

      const nextType = numbered ? "ol" : "ul";

      if (listType !== nextType) {

        closeList();

        html.push(
          nextType === "ol" ? "<ol>" : "<ul>"
        );

        listType = nextType;
      }

      html.push(
        `<li>${inlineFormat((bullet || numbered)[1])}</li>`
      );

      continue;
    }


    closeList();

    html.push(
      `<p>${inlineFormat(trimmed)}</p>`
    );
  }


  closeList();

  pathArticle.innerHTML = html.join("");

  pathArticle.hidden = false;
}


// ==========================================
// API RESPONSE HANDLING
// ==========================================

async function readResponse(response) {

  const contentType =
    response.headers.get("content-type") || "";

  let payload;


  if (contentType.includes("application/json")) {

    payload = await response.json();

  } else {

    payload = await response.text();
  }


  if (!response.ok) {

    const message =
      payload && typeof payload === "object"

        ? payload.detail ||
          payload.message ||
          `Request failed (${response.status})`

        : payload ||
          `Request failed (${response.status})`;

    throw new Error(message);
  }


  return payload;
}


// ==========================================
// LOGIN AND SIGNUP
// ==========================================

async function handleAuthSubmit(event) {

  event.preventDefault();

  if (isAuthenticating) {
    return;
  }


  const email = emailInput.value.trim();

  const password = passwordInput.value;

  const name = nameInput.value.trim();


  authError.textContent = "";


  if (!email || !password) {

    authError.textContent =
      "Enter your email and password.";

    return;
  }


  if (mode === "signup" && !name) {

    authError.textContent =
      "Enter your name to create an account.";

    nameInput.focus();

    return;
  }


  const endpoint =
    mode === "signup" ? "/signup" : "/login";


  const body =
    mode === "signup"

      ? { name, email, password }

      : { email, password };


  isAuthenticating = true;

  authSubmit.disabled = true;

  authSubmit.textContent =
    mode === "signup"
      ? "Creating account..."
      : "Logging in...";


  try {

    const response = await fetch(`${API}${endpoint}`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)

    });


    const user = await readResponse(response);


    if (!user || !user.id) {

      throw new Error(
        "The server returned an invalid user response."
      );
    }


    // Save authenticated user.
    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );


    authForm.reset();

    setMode("login");


    // Display the learning studio.
    showStudio(user);


  } catch (error) {

    console.error("Authentication failed:", error);


    authError.textContent =
      error.message === "Failed to fetch"

        ? "Cannot reach the server. Start the backend on port 8001."

        : error.message ||
          "Authentication failed. Please try again.";


  } finally {

    isAuthenticating = false;

    authSubmit.disabled = false;

    authSubmit.textContent =
      mode === "signup"
        ? "Create account"
        : "Log in";
  }
}


// ==========================================
// LOADING STATE
// ==========================================

function showLoadingState() {

  isGenerating = true;

  askSubmit.disabled = true;

  askSubmit.textContent = "Generating...";


  statusLine.innerHTML =
    "Creating your personalized learning roadmap..." +
    "<small>This may take more than 1 minute. Please wait while we prepare your roadmap. Do not refresh or close this page.</small>";


  pathArticle.hidden = true;

  downloadControls.hidden = true;

  askSubmit.blur();
}


function hideLoadingState() {

  isGenerating = false;

  askSubmit.disabled = false;

  askSubmit.textContent = "Map the path";

  statusLine.textContent = "";
}


// ==========================================
// ROADMAP GENERATION
// ==========================================

async function generateTopic() {

  const topic = topicInput.value.trim();


  if (!topic || isGenerating) {
    return;
  }


  const user = currentUser();


  if (!user || !user.id) {

    sessionStorage.removeItem(USER_KEY);

    showAuth();

    setMode("login");

    return;
  }


  showLoadingState();


  try {

    const response = await fetch(`${API}/chat`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        user_id: user.id,

        message: topic

      })

    });


    const data = await readResponse(response);


    const reply =
      data.reply ||
      data.output_text ||
      data.response;


    if (!reply || typeof reply !== "string") {

      throw new Error(
        "No roadmap content received. Please try again."
      );
    }


    lastRoadmapText = reply;

    renderPath(reply);


    downloadControls.hidden = false;

    statusLine.textContent =
      "Your learning roadmap is ready.";


  } catch (error) {

    console.error("Roadmap generation failed:", error);

    statusLine.textContent =
      `Error: ${error.message}. Please try again.`;


  } finally {

    isGenerating = false;

    askSubmit.disabled = false;

    askSubmit.textContent = "Map the path";
  }
}


// ==========================================
// DOWNLOAD HELPERS
// ==========================================

function downloadBlob(content, mimeType, filename) {

  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();


  setTimeout(() => {

    URL.revokeObjectURL(url);

  }, 1000);
}


// ==========================================
// TXT EXPORT
// ==========================================

function exportTXT() {

  if (!lastRoadmapText) {
    return;
  }

  downloadBlob(
    lastRoadmapText,
    "text/plain;charset=utf-8",
    "roadmap.txt"
  );
}


// ==========================================
// MARKDOWN EXPORT
// ==========================================

function exportMd() {

  if (!lastRoadmapText) {
    return;
  }

  downloadBlob(
    lastRoadmapText,
    "text/markdown;charset=utf-8",
    "roadmap.md"
  );
}


// ==========================================
// PDF EXPORT
// ==========================================

function safeFilename(value) {

  return String(value || "roadmap")

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "_")

    .replace(/^_+|_+$/g, "") || "roadmap";
}


async function exportPdf() {

  if (!lastRoadmapText) {
    return;
  }


  try {

    if (!window.jspdf) {

      statusLine.textContent =
        "Loading PDF generator...";


      await new Promise((resolve, reject) => {

        const script =
          document.createElement("script");

        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

        script.onload = resolve;

        script.onerror = () => {

          reject(
            new Error(
              "Could not load PDF library. Check your internet connection."
            )
          );
        };

        document.head.appendChild(script);

      });
    }


    const JsPDF = window.jspdf?.jsPDF;


    if (!JsPDF) {

      throw new Error(
        "PDF library did not initialize."
      );
    }


    const doc = new JsPDF({
      unit: "pt",
      format: "a4"
    });


    const margin = 48;

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const maxWidth =
      pageWidth - margin * 2;

    const lineHeight = 15;

    let y = margin;


    const paragraphs =
      lastRoadmapText.split(/\r?\n/);


    for (const paragraph of paragraphs) {

      if (!paragraph.trim()) {

        y += lineHeight;

        continue;
      }


      const lines =
        doc.splitTextToSize(
          paragraph,
          maxWidth
        );


      for (const line of lines) {

        if (y > pageHeight - margin) {

          doc.addPage();

          y = margin;
        }


        doc.text(line, margin, y);

        y += lineHeight;
      }
    }


    doc.save(
      `${safeFilename(topicInput.value)}_roadmap.pdf`
    );


    statusLine.textContent =
      "PDF downloaded.";


  } catch (error) {

    console.error("PDF export failed:", error);

    statusLine.textContent =
      error.message || "Could not create PDF.";
  }
}


// ==========================================
// EVENT LISTENERS
// ==========================================

// Login button.
showLogin.addEventListener("click", () => {

  setMode("login");

});


// Signup button.
showSignup.addEventListener("click", () => {

  setMode("signup");

});


// Authentication form.
authForm.addEventListener(
  "submit",
  handleAuthSubmit
);


// Logout.
logoutButton.addEventListener("click", () => {

  sessionStorage.removeItem(USER_KEY);

  authForm.reset();

  setMode("login");

  showAuth();

});


// Topic form.
askForm.addEventListener("submit", (event) => {

  event.preventDefault();

  generateTopic();

});


// Suggested topics.
document.querySelectorAll("[data-topic]").forEach((button) => {

  button.addEventListener("click", () => {

    topicInput.value = button.dataset.topic || "";

    topicInput.focus();

  });

});


// TXT download.
downloadTxt.addEventListener("click", exportTXT);


// Markdown download.
downloadMd.addEventListener("click", exportMd);


// PDF download.
downloadPdf.addEventListener("click", exportPdf);


// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

function initializeApp() {

  setMode("login");

  downloadControls.hidden = true;


  const savedUser = currentUser();


  if (savedUser && savedUser.id) {

    showStudio(savedUser);

  } else {

    sessionStorage.removeItem(USER_KEY);

    showAuth();
  }
}


initializeApp();

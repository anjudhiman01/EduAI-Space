// ==========================================
// 1. API CONFIGURATION & ENVIRONMENT SETUP (UPDATED FOR GEMINI 2.5)
// =========================================

// GEMINI API key
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";

// Gemini 2.5 Flash's  active URL endpoint
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Session management states
let chatHistory = [];
let currentSessionId = localStorage.getItem("eduai_current_session") || null;
let currentSummaryId = localStorage.getItem("eduai_current_summary") || null;
let currentQuizId = localStorage.getItem("eduai_current_quiz") || null;

// DOM Elements Linkage
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("chatInput");
const btnSendChat = document.getElementById("btnSendChat");

const summaryInput = document.getElementById("summaryInput");
const btnSummarize = document.getElementById("btnSummarize");
const summaryOutput = document.getElementById("summaryOutput");

const quizTopic = document.getElementById("quizTopic");
const btnGenerateQuiz = document.getElementById("btnGenerateQuiz");
const quizOutput = document.getElementById("quizOutput");

// Sidebar lists & Clear Buttons
const chatSidebar = document.getElementById("chatSidebar");
const btnCloseSidebar = document.getElementById("btnCloseSidebar");
const historyList = document.getElementById("historyList");
const summaryHistoryList = document.getElementById("summaryHistoryList");
const quizHistoryList = document.getElementById("quizHistoryList");

const btnNewChat = document.getElementById("btnNewChat");
const btnNewSummary = document.getElementById("btnNewSummary");
const btnNewQuiz = document.getElementById("btnNewQuiz");

// ==========================================
// 2. INITIALIZATION & LIFECYCLE MANAGEMENT
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  renderAllHistories();

  if (currentSessionId) loadSession(currentSessionId);
  if (currentSummaryId) loadSummary(currentSummaryId);
  if (currentQuizId) loadQuiz(currentQuizId);
});

// ==========================================
// 3. SIDEBAR DRAWER CONTROLS
// ==========================================
window.openSidebar = function () {
  chatSidebar.classList.add("active");
};
btnCloseSidebar.addEventListener("click", () =>
  chatSidebar.classList.remove("active")
);

btnNewChat.addEventListener("click", () => {
  chatHistory = [];
  currentSessionId = null;
  localStorage.removeItem("eduai_current_session");
  chatWindow.innerHTML =
    '<div class="bot-message mb-2">👋 Hi! I am your AI Guide. Ask me any doubts from your syllabus!</div>';
  chatSidebar.classList.remove("active");
});

// ==========================================
// 4. HISTORIES RENDERING ENGINE (LOCALSTORAGE)
// ==========================================
function renderAllHistories() {
  historyList.innerHTML = "";
  const chats = JSON.parse(localStorage.getItem("eduai_all_sessions")) || {};
  const sortedChats = Object.keys(chats).sort((a, b) => b - a);
  if (sortedChats.length === 0)
    historyList.innerHTML = '<p class="text-muted small px-2">No chats.</p>';
  sortedChats.forEach((id) => {
    const firstPrompt = chats[id][0]?.parts[0]?.text || "Empty Chat";
    const title = firstPrompt.length > 15 ? firstPrompt.substring(0, 12) + "..." : firstPrompt;
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<span onclick="loadSession('${id}')"><i class="fa-regular fa-message me-1 text-purple"></i> ${title}</span>
                         <button class="btn-delete-history" onclick="deleteSession('${id}', event)"><i class="fa-solid fa-trash"></i></button>`;
    historyList.appendChild(div);
  });
}

// ==========================================
// 5. CORE UTILITIES & GEMINI API CORE
// ==========================================
async function callGeminiAPI(promptText) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
    });
    if (response.status === 429) return "⚠️ AI service is busy. Try again later.";
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";
  } catch (error) {
    console.error(error);
    return "⚠️ Connection failed.";
  }
}

function showLoader(container) {
  const loader = document.createElement("div");
  loader.className = "typing-loader mb-2";
  loader.id = "temp-loader";
  loader.innerHTML = "<span></span><span></span><span></span>";
  container.appendChild(loader);
  container.scrollTop = container.scrollHeight;
}
function removeLoader() {
  const loader = document.getElementById("temp-loader");
  if (loader) loader.remove();
}

// ==========================================
// 6. MODULES EXECUTION HANDLERS
// ==========================================
async function handleChat() {
  const message = chatInput.value.trim();
  if (!message) return;

  const userDiv = document.createElement("div");
  userDiv.className = "user-message mb-2";
  userDiv.innerText = message;
  chatWindow.appendChild(userDiv);
  chatInput.value = "";
  chatWindow.scrollTop = chatWindow.scrollHeight;
  showLoader(chatWindow);

  try {
    const requestBody = {
      contents: [{ parts: [{ text: message }] }]
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error("API Request Failed");
    const data = await response.json();

    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Unable to handle response.";
    removeLoader();

    const botDiv = document.createElement("div");
    botDiv.className = "bot-message mb-2";
    botDiv.innerText = aiResponse;
    chatWindow.appendChild(botDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

  } catch (err) {
    console.error("Chat error:", err);
    removeLoader();
    const botDiv = document.createElement("div");
    botDiv.className = "bot-message mb-2 text-danger";
    botDiv.innerText = "⚠️ Connection error. Please try again.";
    chatWindow.appendChild(botDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

// Event Listeners
btnSendChat.addEventListener("click", handleChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleChat();
});

// MODULE 2: NOTES SUMMARIZER
btnSummarize.addEventListener("click", async () => {
  const notes = summaryInput.value.trim();
  if (!notes) return alert("Please paste some notes!");
  btnSummarize.disabled = true;
  summaryOutput.classList.remove("d-none");
  summaryOutput.innerText = "AI is thinking...";

  const systemPrompt = `Summarize the following study notes into clear, bulleted key-points, definitions, and an easy summary:\n\n${notes}`;
  const result = await callGeminiAPI(systemPrompt);
  summaryOutput.innerText = result;
  btnSummarize.disabled = false;
});

// MODULE 3: AUTOMATED QUIZ GENERATOR
btnGenerateQuiz.addEventListener("click", async () => {
  const topic = quizTopic.value.trim();
  if (!topic) return alert("Please enter a topic!");
  btnGenerateQuiz.disabled = true;
  quizOutput.classList.remove("d-none");
  quizOutput.innerText = "The quiz is generating...";

  const systemPrompt = `Generate a 3 Multiple Choice Questions (MCQ) test based on the topic: "${topic}". Provide correct answers right below each question.`;
  const result = await callGeminiAPI(systemPrompt);
  quizOutput.innerText = result;
  btnGenerateQuiz.disabled = false;
});
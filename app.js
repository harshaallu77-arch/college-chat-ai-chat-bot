const storageKeys = {
  knowledge: "campusconnect_knowledge",
  pending: "campusconnect_pending_questions",
  chat: "campusconnect_chat"
};

const defaultKnowledge = [
  {
    topic: "admissions",
    keywords: ["admission", "apply", "eligibility", "documents", "application"],
    answer:
      "Admissions are open from May to July. Students usually need mark sheets, transfer certificate, ID proof, passport photos, and the completed application form."
  },
  {
    topic: "fees",
    keywords: ["fee", "fees", "payment", "tuition", "semester fee"],
    answer:
      "Semester fees can be paid through the accounts office or the student portal. Installment requests and late fee waivers should be submitted to the admin office."
  },
  {
    topic: "scholarships",
    keywords: ["scholarship", "financial aid", "reimbursement", "grant"],
    answer:
      "Scholarship applications are handled through the student welfare cell. Keep income certificates, academic records, and bank details ready before applying."
  },
  {
    topic: "hostel",
    keywords: ["hostel", "room", "mess", "warden", "accommodation"],
    answer:
      "Hostel help is managed by the warden office. Students should complete hostel registration, fee payment, and room allocation before move-in."
  },
  {
    topic: "library",
    keywords: ["library", "books", "borrow", "timing", "reading room"],
    answer:
      "The library supports book issue, digital resources, and reading room access. Carry your student ID for borrowing and renewal requests."
  },
  {
    topic: "exams",
    keywords: ["exam", "hall ticket", "internal", "semester", "schedule"],
    answer:
      "Exam schedules are released by the examination cell. Hall tickets, seating, and result notices are normally published before each semester exam."
  },
  {
    topic: "placements",
    keywords: ["placement", "internship", "career", "company", "training"],
    answer:
      "Placement support includes aptitude training, mock interviews, resume reviews, and company drive updates through the placement cell."
  },
  {
    topic: "transport",
    keywords: ["bus", "transport", "route", "pickup", "drop"],
    answer:
      "Transport details such as routes, timings, and pass requests are managed by the transport office. Students should contact the office for route changes."
  }
];

const defaultPrompts = [
  "What documents are needed for admission?",
  "How do I pay semester fees?",
  "Tell me about hostel registration.",
  "When are exam hall tickets released?",
  "How can I contact the placement cell?"
];

const defaultTopics = ["Admissions", "Fees", "Scholarships", "Hostel", "Library", "Exams", "Placements", "Transport"];

const state = {
  knowledge: loadCollection(storageKeys.knowledge, defaultKnowledge),
  pending: loadCollection(storageKeys.pending, []),
  chat: loadCollection(storageKeys.chat, [])
};

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const quickPrompts = document.getElementById("quickPrompts");
const topicList = document.getElementById("topicList");
const knowledgeList = document.getElementById("knowledgeList");
const pendingQuestions = document.getElementById("pendingQuestions");
const knowledgeCount = document.getElementById("knowledgeCount");
const pendingCount = document.getElementById("pendingCount");
const clearChatButton = document.getElementById("clearChatButton");
const clearPendingButton = document.getElementById("clearPendingButton");
const adminForm = document.getElementById("adminForm");
const adminTopic = document.getElementById("adminTopic");
const adminKeywords = document.getElementById("adminKeywords");
const adminAnswer = document.getElementById("adminAnswer");

function loadCollection(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveState() {
  saveCollection(storageKeys.knowledge, state.knowledge);
  saveCollection(storageKeys.pending, state.pending);
  saveCollection(storageKeys.chat, state.chat);
}

function createMessageElement(role, text, note) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.appendChild(paragraph);

  if (note) {
    const small = document.createElement("small");
    small.textContent = note;
    article.appendChild(small);
  }

  return article;
}

function renderChat() {
  chatMessages.innerHTML = "";

  const history = state.chat.length
    ? state.chat
    : [
        {
          role: "bot",
          text: "Hi, I am CampusConnect AI. Ask me anything about your college services, departments, or student life.",
          note: "Starter message"
        }
      ];

  history.forEach((item) => {
    chatMessages.appendChild(createMessageElement(item.role, item.text, item.note));
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderQuickPrompts() {
  quickPrompts.innerHTML = "";

  defaultPrompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "prompt-chip";
    button.textContent = prompt;
    button.addEventListener("click", () => handleUserQuestion(prompt));
    quickPrompts.appendChild(button);
  });
}

function renderTopics() {
  topicList.innerHTML = "";

  defaultTopics.forEach((topic) => {
    const pill = document.createElement("div");
    pill.className = "topic-pill";
    pill.textContent = topic;
    topicList.appendChild(pill);
  });
}

function renderKnowledge() {
  knowledgeList.innerHTML = "";

  state.knowledge.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "knowledge-item";
    item.innerHTML = `
      <h4>${entry.topic}</h4>
      <p>${entry.answer}</p>
      <span>Keywords: ${entry.keywords.join(", ")}</span>
    `;
    knowledgeList.appendChild(item);
  });

  knowledgeCount.textContent = String(state.knowledge.length);
}

function renderPending() {
  pendingQuestions.innerHTML = "";

  if (!state.pending.length) {
    const item = document.createElement("article");
    item.className = "pending-item";
    item.innerHTML = "<h4>No unanswered questions</h4><p>The chatbot is covering all current topics.</p>";
    pendingQuestions.appendChild(item);
  } else {
    state.pending.forEach((question) => {
      const item = document.createElement("article");
      item.className = "pending-item";
      item.innerHTML = `<h4>Student question</h4><p>${question}</p>`;
      pendingQuestions.appendChild(item);
    });
  }

  pendingCount.textContent = String(state.pending.length);
}

function normalizeText(value) {
  return value.toLowerCase().trim();
}

function findBestAnswer(question) {
  const normalized = normalizeText(question);

  let bestMatch = null;
  let bestScore = 0;

  state.knowledge.forEach((entry) => {
    const topicHit = normalized.includes(entry.topic.toLowerCase()) ? 3 : 0;
    const keywordHits = entry.keywords.reduce((score, keyword) => {
      return score + (normalized.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    const total = topicHit + keywordHits;

    if (total > bestScore) {
      bestScore = total;
      bestMatch = entry;
    }
  });

  return bestScore > 0 ? bestMatch : null;
}

function addChatMessage(role, text, note = "") {
  state.chat.push({ role, text, note });
  saveState();
  renderChat();
}

function addPendingQuestion(question) {
  if (!state.pending.includes(question)) {
    state.pending.unshift(question);
    saveState();
    renderPending();
  }
}

function buildFallbackAnswer(question) {
  addPendingQuestion(question);
  return "I do not have a confirmed answer for that yet. I have added your question to the admin review list so staff can update the chatbot knowledge base.";
}

function handleUserQuestion(question) {
  const cleaned = question.trim();
  if (!cleaned) {
    return;
  }

  addChatMessage("user", cleaned);

  const match = findBestAnswer(cleaned);
  const response = match ? match.answer : buildFallbackAnswer(cleaned);
  const note = match ? `Matched topic: ${match.topic}` : "No match found";

  window.setTimeout(() => {
    addChatMessage("bot", response, note);
  }, 240);

  chatInput.value = "";
}

function handleAdminSubmit(event) {
  event.preventDefault();

  const topic = adminTopic.value.trim();
  const keywords = adminKeywords.value
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  const answer = adminAnswer.value.trim();

  if (!topic || !keywords.length || !answer) {
    return;
  }

  const existing = state.knowledge.find((entry) => normalizeText(entry.topic) === normalizeText(topic));

  if (existing) {
    existing.keywords = keywords;
    existing.answer = answer;
  } else {
    state.knowledge.unshift({ topic, keywords, answer });
  }

  state.pending = state.pending.filter((question) => !normalizeText(question).includes(normalizeText(topic)));
  saveState();
  renderKnowledge();
  renderPending();
  adminForm.reset();
  addChatMessage("bot", `Knowledge base updated for "${topic}".`, "Admin action");
}

function clearChat() {
  state.chat = [];
  saveState();
  renderChat();
}

function clearPending() {
  state.pending = [];
  saveState();
  renderPending();
}

function initialize() {
  renderTopics();
  renderQuickPrompts();
  renderKnowledge();
  renderPending();
  renderChat();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleUserQuestion(chatInput.value);
});

adminForm.addEventListener("submit", handleAdminSubmit);
clearChatButton.addEventListener("click", clearChat);
clearPendingButton.addEventListener("click", clearPending);

initialize();

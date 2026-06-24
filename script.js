const exampleSentence = "The experienced programmer carefully tests modern applications in the company.";

const categories = [
  { id: "article", label: "Article", color: "#22c55e" },
  { id: "noun", label: "Noun(s)", color: "#3b82f6" },
  { id: "nounPhrase", label: "Noun phrase(s)", color: "#ec4899" },
  { id: "adjective", label: "Adjective(s)", color: "#f59e0b" },
  { id: "verb", label: "Verb", color: "#ef4444" },
  { id: "adverb", label: "Adverb", color: "#8b5cf6" },
  { id: "preposition", label: "Preposition", color: "#14b8a6" },
];

let words = createWords(exampleSentence);
let nounPhrases = [];

const sentenceInput = document.querySelector("#sentenceInput");
const sentenceElement = document.querySelector("#sentence");
const categoryGrid = document.querySelector("#categoryGrid");
const answersGrid = document.querySelector("#answersGrid");
const selectionStatus = document.querySelector("#selectionStatus");
const checkButton = document.querySelector("#checkButton");
const resetButton = document.querySelector("#resetButton");
const buildButton = document.querySelector("#buildButton");

let selectedIds = new Set();
let isDragging = false;

function renderSentence() {
  sentenceElement.innerHTML = "";

  if (words.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty-sentence";
    empty.textContent = "Escribe una oracion y crea un ejercicio para empezar.";
    sentenceElement.appendChild(empty);
    return;
  }

  words.forEach((word) => {
    const wordButton = document.createElement("button");
    wordButton.type = "button";
    wordButton.className = "word";
    wordButton.textContent = word.text;
    wordButton.dataset.id = String(word.id);

    if (selectedIds.has(word.id)) {
      wordButton.classList.add("selected");
    }

    const isInNounPhrase = nounPhrases.some((phrase) => phrase.wordIds.includes(word.id));

    if (isInNounPhrase) {
      wordButton.classList.add("phrase-tagged");
    }

    if (word.category) {
      const category = categories.find((item) => item.id === word.category);
      wordButton.classList.add("tagged");
      wordButton.style.setProperty("--tag-color", category.color);
      wordButton.title = category.label;
    }

    wordButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!word.cleanText) {
        return;
      }
      isDragging = true;
      toggleSelection(word.id);
      wordButton.setPointerCapture(event.pointerId);
    });

    wordButton.addEventListener("pointerenter", () => {
      if (isDragging) {
        selectedIds.add(word.id);
        updateSelectedWords();
      }
    });

    wordButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSelection(word.id);
      }
    });

    sentenceElement.appendChild(wordButton);
  });
}

function renderCategories() {
  categoryGrid.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.textContent = category.label;
    button.style.setProperty("--category-color", category.color);
    button.addEventListener("click", () => applyCategory(category.id));
    categoryGrid.appendChild(button);
  });
}

function renderAnswers() {
  answersGrid.innerHTML = "";

  categories.forEach((category) => {
    const taggedWords = words.filter((word) => word.category === category.id);
    const card = document.createElement("article");
    card.className = "answer-card";
    card.style.setProperty("--category-color", category.color);

    const title = document.createElement("h3");
    title.textContent = category.label;
    card.appendChild(title);

    if (category.id === "nounPhrase") {
      renderPhraseList(card);
    } else if (taggedWords.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Sin palabras etiquetadas.";
      card.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "tag-list";

      taggedWords.forEach((word) => {
        const pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = word.cleanText;
        list.appendChild(pill);
      });

      card.appendChild(list);
    }

    answersGrid.appendChild(card);
  });
}

function renderPhraseList(card) {
  if (nounPhrases.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Sin frases nominales marcadas.";
    card.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "tag-list";

  nounPhrases.forEach((phrase) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "tag-pill removable";
    pill.textContent = phrase.text;
    pill.title = "Quitar frase nominal";
    pill.addEventListener("click", () => {
      nounPhrases = nounPhrases.filter((item) => item.id !== phrase.id);
      renderSentence();
      renderAnswers();
      showFeedback("Frase nominal quitada.", "warning");
    });
    list.appendChild(pill);
  });

  card.appendChild(list);
}

function toggleSelection(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }

  updateSelectedWords();
}

function updateSelectedWords() {
  document.querySelectorAll(".word").forEach((button) => {
    const id = Number(button.dataset.id);
    button.classList.toggle("selected", selectedIds.has(id));
  });

  const selectedWords = words
    .filter((word) => selectedIds.has(word.id) && word.cleanText !== "")
    .map((word) => word.cleanText);

  selectionStatus.textContent = selectedWords.length
    ? `Seleccionado: ${selectedWords.join(", ")}`
    : "Selecciona palabras del parrafo.";
}

function applyCategory(categoryId) {
  if (selectedIds.size === 0) {
    showFeedback("Primero selecciona una o varias palabras.", "warning");
    return;
  }

  if (categoryId === "nounPhrase") {
    addNounPhrase();
    return;
  }

  words.forEach((word) => {
    if (selectedIds.has(word.id) && word.cleanText !== "") {
      word.category = categoryId;
    }
  });

  selectedIds.clear();
  showFeedback("", "");
  renderSentence();
  renderAnswers();
  updateSelectedWords();
}

function addNounPhrase() {
  const selectedWords = words
    .filter((word) => selectedIds.has(word.id) && word.cleanText !== "")
    .sort((first, second) => first.id - second.id);

  if (selectedWords.length === 0) {
    showFeedback("Selecciona palabras, no solo signos de puntuacion.", "warning");
    return;
  }

  const wordIds = selectedWords.map((word) => word.id);
  const key = wordIds.join("-");
  const alreadyExists = nounPhrases.some((phrase) => phrase.key === key);

  if (!alreadyExists) {
    nounPhrases.push({
      id: Date.now(),
      key,
      text: formatPhrase(selectedWords),
      wordIds,
    });
  }

  selectedIds.clear();
  showFeedback("", "");
  renderSentence();
  renderAnswers();
  updateSelectedWords();
}

function checkAnswers() {
  const classifiableWords = words.filter((word) => word.cleanText);
  const pendingWords = classifiableWords.filter((word) => !word.category);
  const missingNounPhrase = nounPhrases.length === 0;

  if (classifiableWords.length === 0) {
    showFeedback("Primero crea un ejercicio con una oracion.", "warning");
  } else if (pendingWords.length === 0 && !missingNounPhrase) {
    showFeedback("Listo: todas las palabras tienen una etiqueta y marcaste frases nominales.", "success");
  } else {
    const messages = [];

    if (pendingWords.length > 0) {
      messages.push(`Faltan etiquetar: ${pendingWords.map((word) => word.cleanText).join(", ")}`);
    }

    if (missingNounPhrase) {
      messages.push("falta marcar al menos una frase nominal");
    }

    showFeedback(`${messages.join("; ")}.`, "warning");
  }
}

function resetExercise() {
  selectedIds.clear();
  nounPhrases = [];
  words.forEach((word) => {
    word.category = null;
  });
  showFeedback("", "");
  renderSentence();
  renderAnswers();
  updateSelectedWords();
}

function buildExercise() {
  const nextSentence = sentenceInput.value.trim();

  if (!nextSentence) {
    showFeedback("Escribe una oracion antes de crear el ejercicio.", "warning");
    sentenceInput.focus();
    return;
  }

  words = createWords(nextSentence);
  selectedIds.clear();
  nounPhrases = [];
  showFeedback("Nuevo ejercicio creado.", "success");
  renderSentence();
  renderAnswers();
  updateSelectedWords();
}

function createWords(text) {
  const tokens = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[.,!?;:()"]/g) || [];

  return tokens.map((token, index) => ({
    id: index,
    text: token,
    cleanText: token.replace(/[.,!?;:()"]/g, ""),
    category: null,
  }));
}

function formatPhrase(phraseWords) {
  return phraseWords.reduce((phrase, word) => {
    if (!phrase) {
      return word.text;
    }

    if (/^[.,!?;:)]$/.test(word.text)) {
      return `${phrase}${word.text}`;
    }

    return `${phrase} ${word.text}`;
  }, "");
}

function showFeedback(message, type) {
  const feedback = document.querySelector("#feedback");
  feedback.textContent = message;
  feedback.className = type ? `feedback ${type}` : "feedback";
}

document.addEventListener("pointerup", () => {
  isDragging = false;
});

checkButton.addEventListener("click", checkAnswers);
resetButton.addEventListener("click", resetExercise);
buildButton.addEventListener("click", buildExercise);
sentenceInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    buildExercise();
  }
});

renderSentence();
renderCategories();
renderAnswers();

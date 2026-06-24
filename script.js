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
let exerciseTargets;

const sentenceInput = document.querySelector("#sentenceInput");
const sentenceElement = document.querySelector("#sentence");
const categoryGrid = document.querySelector("#categoryGrid");
const goalGrid = document.querySelector("#goalGrid");
const answersGrid = document.querySelector("#answersGrid");
const reviewGrid = document.querySelector("#reviewGrid");
const selectionStatus = document.querySelector("#selectionStatus");
const checkButton = document.querySelector("#checkButton");
const resetButton = document.querySelector("#resetButton");
const buildButton = document.querySelector("#buildButton");
const undoButton = document.querySelector("#undoButton");

let selectedIds = new Set();
let isDragging = false;
let historyStack = [];
let reviewResults = {};

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
        addSelection(word.id);
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

function renderAll() {
  renderSentence();
  renderAnswers();
  renderGoals();
  renderReview();
  updateSelectedWords();
  updateUndoButton();
}

function renderGoals() {
  goalGrid.innerHTML = "";

  categories.forEach((category) => {
    const target = exerciseTargets[category.id] || 0;
    const current = getCurrentCount(category.id);
    const item = document.createElement("article");
    item.className = "goal-card";
    item.style.setProperty("--category-color", category.color);
    const review = reviewResults[category.id];

    if (review) {
      item.classList.add(`review-${review.status}`);
    }

    const title = document.createElement("h3");
    title.textContent = category.label;
    item.appendChild(title);

    const count = document.createElement("p");
    count.textContent = `${current} / ${target}`;
    item.appendChild(count);

    if (target > 0 && current === target) {
      item.classList.add("complete");
    }

    goalGrid.appendChild(item);
  });
}

function renderReview() {
  reviewGrid.innerHTML = "";

  if (Object.keys(reviewResults).length === 0) {
    return;
  }

  categories.forEach((category) => {
    const review = reviewResults[category.id];

    if (!review) {
      return;
    }

    const card = document.createElement("article");
    card.className = `review-card review-${review.status}`;
    card.style.setProperty("--category-color", category.color);

    const title = document.createElement("h3");
    title.textContent = category.label;
    card.appendChild(title);

    const message = document.createElement("p");
    message.textContent = review.message;
    card.appendChild(message);

    reviewGrid.appendChild(card);
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
    const pill = document.createElement("span");
    const validation = validateNounPhrase(phrase);
    pill.className = validation.valid ? "tag-pill removable" : "tag-pill removable invalid";

    const text = document.createElement("span");
    text.textContent = phrase.text;
    pill.appendChild(text);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-pill-button";
    removeButton.textContent = "x";
    removeButton.title = validation.valid ? "Quitar frase nominal" : `${validation.message}. Quitar frase nominal.`;
    removeButton.addEventListener("click", () => removeNounPhrase(phrase.id));
    pill.appendChild(removeButton);

    list.appendChild(pill);
  });

  card.appendChild(list);
}

function toggleSelection(id) {
  saveHistory();

  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }

  updateSelectedWords();
}

function addSelection(id) {
  if (selectedIds.has(id)) {
    return;
  }

  selectedIds.add(id);
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

  saveHistory();

  words.forEach((word) => {
    if (selectedIds.has(word.id) && word.cleanText !== "") {
      word.category = categoryId;
    }
  });

  selectedIds.clear();
  showFeedback("", "");
  reviewResults = {};
  renderAll();
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
    saveHistory();
    nounPhrases.push({
      id: Date.now(),
      key,
      text: formatPhrase(selectedWords),
      wordIds,
    });
  } else {
    showFeedback("Esa frase nominal ya estaba guardada.", "warning");
    renderAll();
    return;
  }

  selectedIds.clear();
  if (!alreadyExists) {
    showFeedback("", "");
  }
  reviewResults = {};
  renderAll();
}

function removeNounPhrase(phraseId) {
  const phraseExists = nounPhrases.some((phrase) => phrase.id === phraseId);

  if (!phraseExists) {
    return;
  }

  saveHistory();
  nounPhrases = nounPhrases.filter((phrase) => phrase.id !== phraseId);
  selectedIds.clear();
  showFeedback("Frase nominal quitada.", "warning");
  reviewResults = {};
  renderAll();
}

function checkAnswers() {
  const classifiableWords = words.filter((word) => word.cleanText);
  const pendingWords = classifiableWords.filter((word) => !word.category);
  const missingNounPhrase = exerciseTargets.nounPhrase > 0 && nounPhrases.length === 0;
  const invalidNounPhrases = nounPhrases
    .map((phrase) => ({
      phrase,
      validation: validateNounPhrase(phrase),
    }))
    .filter((item) => !item.validation.valid);
  reviewResults = buildReviewResults(invalidNounPhrases);

  if (classifiableWords.length === 0) {
    showFeedback("Primero crea un ejercicio con una oracion.", "warning");
  } else if (pendingWords.length === 0 && !missingNounPhrase && invalidNounPhrases.length === 0 && countsMatchTargets()) {
    showFeedback("Listo: todas las palabras tienen una etiqueta y las frases nominales son validas.", "success");
  } else {
    const messages = [];

    if (pendingWords.length > 0) {
      messages.push(`faltan etiquetar ${pendingWords.length} palabra${pendingWords.length === 1 ? "" : "s"}`);
    }

    if (missingNounPhrase) {
      messages.push("falta marcar al menos una frase nominal");
    }

    if (invalidNounPhrases.length > 0) {
      messages.push(
        `revisa frases nominales: ${invalidNounPhrases
          .map((item) => `${item.phrase.text} (${item.validation.message})`)
          .join(", ")}`
      );
    }

    if (!countsMatchTargets()) {
      messages.push("revisa las cantidades del objetivo");
    }

    showFeedback(`${messages.join("; ")}.`, "warning");
  }

  renderGoals();
  renderReview();
}

function resetExercise() {
  saveHistory();
  selectedIds.clear();
  nounPhrases = [];
  words.forEach((word) => {
    word.category = null;
  });
  showFeedback("", "");
  reviewResults = {};
  renderAll();
}

function buildExercise() {
  const nextSentence = sentenceInput.value.trim();

  if (!nextSentence) {
    showFeedback("Escribe una oracion antes de crear el ejercicio.", "warning");
    sentenceInput.focus();
    return;
  }

  words = createWords(nextSentence);
  exerciseTargets = analyzeExercise(words);
  selectedIds.clear();
  nounPhrases = [];
  historyStack = [];
  reviewResults = {};
  showFeedback("Nuevo ejercicio creado.", "success");
  renderAll();
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

function getCurrentCount(categoryId) {
  if (categoryId === "nounPhrase") {
    return nounPhrases.filter((phrase) => validateNounPhrase(phrase).valid).length;
  }

  return words.filter((word) => word.category === categoryId).length;
}

function countsMatchTargets() {
  return categories.every((category) => getCurrentCount(category.id) === (exerciseTargets[category.id] || 0));
}

function buildReviewResults(invalidNounPhrases) {
  return categories.reduce((results, category) => {
    const target = exerciseTargets[category.id] || 0;
    const current = getCurrentCount(category.id);

    if (category.id === "nounPhrase" && invalidNounPhrases.length > 0) {
      results[category.id] = {
        status: "error",
        message: "Hay una frase nominal que rompe una regla. Revisa que sea continua y que no incluya verbo, adverbio ni preposicion.",
      };
      return results;
    }

    if (current === target) {
      results[category.id] = {
        status: "ok",
        message: "Cantidad correcta.",
      };
      return results;
    }

    if (current < target) {
      results[category.id] = {
        status: "warning",
        message: `Faltan ${target - current}.`,
      };
      return results;
    }

    results[category.id] = {
      status: "error",
      message: `Sobran ${current - target}.`,
    };
    return results;
  }, {});
}

function analyzeExercise(sourceWords) {
  const guessedCategories = classifyWords(sourceWords);
  const targets = categories.reduce((result, category) => {
    result[category.id] = 0;
    return result;
  }, {});

  guessedCategories.forEach((category) => {
    if (category && category !== "nounPhrase") {
      targets[category] += 1;
    }
  });

  targets.nounPhrase = findNounPhraseRanges(sourceWords, guessedCategories).length;
  return targets;
}

function classifyWords(sourceWords) {
  const classifiableWords = sourceWords.filter((word) => word.cleanText);
  const text = classifiableWords.map((word) => word.cleanText).join(" ");
  const terms = getNlpTerms(text);
  let termIndex = 0;

  const guessedCategories = sourceWords.map((word) => {
    if (!word.cleanText) {
      return null;
    }

    const term = terms[termIndex];
    termIndex += 1;
    return categoryFromTags(term?.tags || []);
  });

  return refineAmbiguousCategories(sourceWords, terms, guessedCategories);
}

function getNlpTerms(text) {
  if (typeof nlp !== "function") {
    return [];
  }

  return nlp(text)
    .json()
    .flatMap((sentence) => sentence.terms || []);
}

function categoryFromTags(tags) {
  const tagSet = new Set(tags);

  if (tagSet.has("Determiner") || tagSet.has("Article")) {
    return "article";
  }

  if (tagSet.has("Preposition")) {
    return "preposition";
  }

  if (tagSet.has("Adverb")) {
    return "adverb";
  }

  if (tagSet.has("Verb") || tagSet.has("Copula") || tagSet.has("Auxiliary")) {
    return "verb";
  }

  if (tagSet.has("Adjective")) {
    return "adjective";
  }

  if (tagSet.has("Noun") || tagSet.has("Person") || tagSet.has("Place") || tagSet.has("Organization")) {
    return "noun";
  }

  return null;
}

function refineAmbiguousCategories(sourceWords, terms, guessedCategories) {
  const refinedCategories = [...guessedCategories];
  const termByWordId = new Map();
  let termIndex = 0;

  sourceWords.forEach((word) => {
    if (!word.cleanText) {
      return;
    }

    termByWordId.set(word.id, terms[termIndex] || {});
    termIndex += 1;
  });

  sourceWords.forEach((word, index) => {
    const term = termByWordId.get(word.id) || {};
    const nextWord = sourceWords[index + 1];
    const nextTerm = nextWord ? termByWordId.get(nextWord.id) || {} : {};
    const nextCategory = refinedCategories[index + 1];

    if (refinedCategories[index] === "noun" && hasSwitch(term, "Adj|Noun") && isPluralNounCandidate(nextTerm, nextCategory)) {
      refinedCategories[index] = "adjective";
    }

    if (refinedCategories[index] === "noun" && nextCategory === "noun" && looksLikeAdjective(word.cleanText)) {
      refinedCategories[index] = "adjective";
    }

    if (refinedCategories[index] === "verb" && isPluralNounCandidate(term, refinedCategories[index])) {
      const previousCategory = refinedCategories[index - 1];
      const previousWord = sourceWords[index - 1];
      const previousTerm = previousWord ? termByWordId.get(previousWord.id) || {} : {};
      const followsNominalModifier =
        previousCategory === "article" ||
        previousCategory === "adjective" ||
        (previousCategory === "noun" && hasSwitch(previousTerm, "Adj|Noun"));

      if (followsNominalModifier) {
        refinedCategories[index] = "noun";
      }
    }

    if (refinedCategories[index] === "verb" && nextCategory !== "noun" && previousCategoryIsAdjective(refinedCategories[index - 1]) && looksPlural(word.cleanText)) {
      refinedCategories[index] = "noun";
    }
  });

  return refinedCategories;
}

function hasSwitch(term, value) {
  return typeof term.switch === "string" && term.switch.includes(value);
}

function isPluralNounCandidate(term, category) {
  return category === "verb" && hasSwitch(term, "Plural|Verb");
}

function previousCategoryIsAdjective(category) {
  return category === "adjective";
}

function looksPlural(text) {
  return /^[a-z]+s$/i.test(text) && !/ss$/i.test(text);
}

function looksLikeAdjective(text) {
  return /(al|able|ible|ful|ic|ical|ive|less|ous)$/i.test(text);
}

function findNounPhraseRanges(sourceWords, guessedCategories) {
  const ranges = [];
  let start = null;
  let hasNoun = false;
  const allowed = new Set(["article", "adjective", "noun"]);

  guessedCategories.forEach((category, index) => {
    const isAllowed = allowed.has(category);

    if (!isAllowed) {
      if (start !== null && hasNoun) {
        ranges.push([start, index - 1]);
      }
      start = null;
      hasNoun = false;
      return;
    }

    if (start === null) {
      start = index;
    }

    if (category === "noun") {
      hasNoun = true;
    }
  });

  if (start !== null && hasNoun) {
    ranges.push([start, guessedCategories.length - 1]);
  }

  return ranges.filter(([from, to]) => {
    const phraseWords = sourceWords.slice(from, to + 1).filter((word) => word.cleanText);
    return phraseWords.length > 1;
  });
}

function validateNounPhrase(phrase) {
  const phraseWords = phrase.wordIds
    .map((id) => words.find((word) => word.id === id))
    .filter((word) => word && word.cleanText);
  const allowedCategories = new Set(["article", "adjective", "noun"]);
  const hasUntaggedWord = phraseWords.some((word) => !word.category);
  const hasNoun = phraseWords.some((word) => word.category === "noun");
  const invalidWords = phraseWords.filter((word) => word.category && !allowedCategories.has(word.category));
  const sortedIds = phrase.wordIds.slice().sort((first, second) => first - second);
  const isContinuous = sortedIds.every((id, index) => index === 0 || id === sortedIds[index - 1] + 1);

  if (phraseWords.length === 0) {
    return { valid: false, message: "no contiene palabras" };
  }

  if (phraseWords.length === 1) {
    return { valid: false, message: "debe tener mas de una palabra" };
  }

  if (!isContinuous) {
    return { valid: false, message: "debe ser un bloque continuo" };
  }

  if (hasUntaggedWord) {
    return { valid: false, message: "primero etiqueta sus palabras" };
  }

  if (invalidWords.length > 0) {
    return {
      valid: false,
      message: `incluye ${invalidWords.map((word) => word.cleanText).join(", ")}`
    };
  }

  if (!hasNoun) {
    return { valid: false, message: "no contiene sustantivo" };
  }

  return { valid: true, message: "frase nominal valida" };
}

function saveHistory() {
  historyStack.push({
    words: words.map((word) => ({ ...word })),
    nounPhrases: nounPhrases.map((phrase) => ({
      ...phrase,
      wordIds: [...phrase.wordIds],
    })),
    selectedIds: [...selectedIds],
  });

  if (historyStack.length > 30) {
    historyStack.shift();
  }

  updateUndoButton();
}

function undoLastAction() {
  if (selectedIds.size > 0) {
    selectedIds.clear();
    showFeedback("Seleccion deshecha.", "warning");
    reviewResults = {};
    renderAll();
    return;
  }

  const previousState = historyStack.pop();

  if (!previousState) {
    return;
  }

  words = previousState.words.map((word) => ({ ...word }));
  nounPhrases = previousState.nounPhrases.map((phrase) => ({
    ...phrase,
    wordIds: [...phrase.wordIds],
  }));
  selectedIds = new Set(previousState.selectedIds || []);
  showFeedback("Ultima accion deshecha.", "warning");
  reviewResults = {};
  renderAll();
}

function updateUndoButton() {
  undoButton.disabled = historyStack.length === 0;
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
undoButton.addEventListener("click", undoLastAction);
sentenceInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    buildExercise();
  }
});

exerciseTargets = analyzeExercise(words);
renderSentence();
renderCategories();
renderAnswers();
renderGoals();
updateUndoButton();

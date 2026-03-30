const controls = {
  corner: document.getElementById("corner"),
  cut: document.getElementById("cut"),
  cutRound: document.getElementById("cutRound"),
  color: document.getElementById("color"),
};

const outputs = {
  corner: document.getElementById("cornerOut"),
  cut: document.getElementById("cutOut"),
  cutRound: document.getElementById("cutRoundOut"),
};

const previewCard = document.getElementById("previewCard");
const shapeButtons = [...document.querySelectorAll(".shape-btn")];
const codeOutput = document.getElementById("codeOutput");
const copyBtn = document.getElementById("copyBtn");

const SHAPES = {
  tl: { tl: true, tr: false, br: false, bl: false, className: "shape-tl" },
  tr: { tl: false, tr: true, br: false, bl: false, className: "shape-tr" },
  br: { tl: false, tr: false, br: true, bl: false, className: "shape-br" },
  bl: { tl: false, tr: false, br: false, bl: true, className: "shape-bl" },
  "tl-br": { tl: true, tr: false, br: true, bl: false, className: "shape-tl-br" },
  "tr-bl": { tl: false, tr: true, br: false, bl: true, className: "shape-tr-bl" },
  all: { tl: true, tr: true, br: true, bl: true, className: "shape-all" },
};

const state = {
  corner: Number(controls.corner.value),
  cut: Number(controls.cut.value),
  cutRound: Number(controls.cutRound.value),
  color: controls.color.value,
  shape: "tl-br",
};

function buildPolygon(cuts) {
  const points = [];

  if (cuts.tl) points.push("calc(var(--c) + var(--d)) 0");
  else points.push("0 0");

  if (cuts.tr) {
    points.push(
      "calc(100% - var(--c) - var(--d)) 0",
      "calc(100% - var(--c) - var(--a)) var(--b)",
      "calc(100% - var(--c) + var(--u)) var(--u)",
      "calc(100% - var(--u)) calc(var(--c) - var(--u))",
      "calc(100% - var(--b)) calc(var(--c) + var(--a))",
      "100% calc(var(--c) + var(--d))"
    );
  } else {
    points.push("100% 0");
  }

  if (cuts.br) {
    points.push(
      "100% calc(100% - var(--c) - var(--d))",
      "calc(100% - var(--b)) calc(100% - var(--c) - var(--a))",
      "calc(100% - var(--u)) calc(100% - var(--c) + var(--u))",
      "calc(100% - var(--c) + var(--u)) calc(100% - var(--u))",
      "calc(100% - var(--c) - var(--a)) calc(100% - var(--b))",
      "calc(100% - var(--c) - var(--d)) 100%"
    );
  } else {
    points.push("100% 100%");
  }

  if (cuts.bl) {
    points.push(
      "calc(var(--c) + var(--d)) 100%",
      "calc(var(--c) + var(--a)) calc(100% - var(--b))",
      "calc(var(--c) - var(--u)) calc(100% - var(--u))",
      "var(--u) calc(100% - var(--c) + var(--u))",
      "var(--b) calc(100% - var(--c) - var(--a))",
      "0 calc(100% - var(--c) - var(--d))"
    );
  } else {
    points.push("0 100%");
  }

  if (cuts.tl) {
    points.push(
      "0 calc(var(--c) + var(--d))",
      "var(--b) calc(var(--c) + var(--a))",
      "var(--u) calc(var(--c) - var(--u))",
      "calc(var(--c) - var(--u)) var(--u)",
      "calc(var(--c) + var(--a)) var(--b)"
    );
  }

  return `polygon(\n    ${points.join(",\n    ")}\n  )`;
}

function getCurrentShape() {
  return SHAPES[state.shape] || SHAPES["tl-br"];
}

function renderPreview() {
  const shape = getCurrentShape();
  const polygon = buildPolygon(shape);

  previewCard.style.setProperty("--corner", `${state.corner}px`);
  previewCard.style.setProperty("--cut", `${state.cut}px`);
  previewCard.style.setProperty("--cut-round", `${state.cutRound}px`);
  previewCard.style.setProperty("--fill", state.color);
  previewCard.style.setProperty("--shape-clip", polygon);
}

function updateOutputs() {
  outputs.corner.textContent = `${state.corner}px`;
  outputs.cut.textContent = `${state.cut}px`;
  outputs.cutRound.textContent = `${state.cutRound}px`;
}

function updateCode() {
  const shape = getCurrentShape();
  const polygon = buildPolygon(shape);

  const code = [
    `/* выбранная фигура: ${shape.className} */`,
    ".mask-card {",
    `  --corner: ${state.corner}px;`,
    `  --cut: ${state.cut}px;`,
    `  --cut-round: ${state.cutRound}px;`,
    "  --c: min(var(--cut), 48%);",
    "  --d: max(0px, min(calc(var(--cut-round) * 0.41421356), calc(var(--c) * 0.68)));",
    "  --u: calc(var(--d) * 0.70710678);",
    "  --a: calc(var(--d) * 0.07612047);",
    "  --b: calc(var(--d) * 0.18386400);",
    `  --shape-clip: ${polygon};`,
    "",
    "  position: relative;",
    "  border-radius: min(var(--corner), 48%);",
    "  overflow: hidden;",
    "}",
    "",
    ".mask-card::before {",
    '  content: "";',
    "  position: absolute;",
    "  inset: 0;",
    `  background: ${state.color};`,
    "  clip-path: var(--shape-clip);",
    "  -webkit-clip-path: var(--shape-clip);",
    "}",
    "",
    ".mask-card > * {",
    "  position: relative;",
    "  z-index: 1;",
    "}",
  ].join("\n");

  codeOutput.textContent = code;
}

function applyState() {
  state.corner = Number(controls.corner.value);
  state.cut = Number(controls.cut.value);
  state.cutRound = Number(controls.cutRound.value);
  state.color = controls.color.value;

  updateOutputs();
  renderPreview();
  updateCode();
}

function setShape(shapeId) {
  if (!SHAPES[shapeId]) return;
  state.shape = shapeId;

  shapeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.shape === shapeId);
  });

  renderPreview();
  updateCode();
}

async function copyCode() {
  const content = codeOutput.textContent || "";
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    copyBtn.textContent = "Скопировано";
  } catch (_) {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    copyBtn.textContent = "Скопировано";
  }

  window.setTimeout(() => {
    copyBtn.textContent = "Копировать";
  }, 900);
}

[controls.corner, controls.cut, controls.cutRound, controls.color].forEach((input) => {
  input.addEventListener("input", applyState);
});

shapeButtons.forEach((button) => {
  button.addEventListener("click", () => setShape(button.dataset.shape));
});

copyBtn.addEventListener("click", copyCode);

applyState();
setShape(state.shape);

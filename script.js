const controls = {
  corner: document.getElementById("corner"),
  cut: document.getElementById("cut"),
  cutRound: document.getElementById("cutRound"),
  inverseDepthX: document.getElementById("inverseDepthX"),
  inverseDepthY: document.getElementById("inverseDepthY"),
  inverseInnerRound: document.getElementById("inverseInnerRound"),
  inverseOuterRound: document.getElementById("inverseOuterRound"),
  radialRadius: document.getElementById("radialRadius"),
  color: document.getElementById("color"),
};

const outputs = {
  corner: document.getElementById("cornerOut"),
  cut: document.getElementById("cutOut"),
  cutRound: document.getElementById("cutRoundOut"),
  inverseDepthX: document.getElementById("inverseDepthXOut"),
  inverseDepthY: document.getElementById("inverseDepthYOut"),
  inverseInnerRound: document.getElementById("inverseInnerRoundOut"),
  inverseOuterRound: document.getElementById("inverseOuterRoundOut"),
  radialRadius: document.getElementById("radialRadiusOut"),
};

const previewCard = document.getElementById("previewCard");
const activeCornerName = document.getElementById("activeCornerName");
const cornerTabButtons = [...document.querySelectorAll("[data-select-corner]")];
const modeButtons = [...document.querySelectorAll("[data-mode-button]")];
const modeGroups = [...document.querySelectorAll("[data-mode-group]")];
const codeTabButtons = [...document.querySelectorAll("[data-code-format]")];
const codeOutput = document.getElementById("codeOutput");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");
const appRoot = document.querySelector(".app");
const controlsPanel = document.querySelector(".controls");
const stackedLayoutQuery = window.matchMedia("(max-width: 108rem)");

const CORNERS = ["tl", "tr", "br", "bl"];
const MODES = ["plain", "chamfer", "inverse", "radial"];
const CODE_FORMATS = ["css", "scss"];
const DEFAULT_CODE_FORMAT = "css";
const NO_CORNER_LABEL = "Не выбрано";
const CORNER_LABELS = {
  tl: "Верхний левый угол",
  tr: "Верхний правый угол",
  br: "Нижний правый угол",
  bl: "Нижний левый угол",
};
const ARC_SEGMENTS = 20;

function createCornerState() {
  return {
    mode: "plain",
    cut: 4.2,
    cutRound: 1,
    inverseDepthX: 0,
    inverseDepthY: 0,
    inverseInnerRound: 0,
    inverseOuterRound: 0,
    radialRadius: 0,
  };
}

const DEFAULTS = {
  corner: Number(controls.corner.value),
  color: controls.color.value,
};

function createInitialState() {
  return {
    corner: DEFAULTS.corner,
    color: DEFAULTS.color,
    codeFormat: DEFAULT_CODE_FORMAT,
    selectedCorner: null,
    corners: {
      tl: createCornerState(),
      tr: createCornerState(),
      br: createCornerState(),
      bl: createCornerState(),
    },
  };
}

const state = createInitialState();

const CORNER_INPUT_BINDINGS = [
  [controls.cut, "cut"],
  [controls.cutRound, "cutRound"],
  [controls.inverseDepthX, "inverseDepthX"],
  [controls.inverseDepthY, "inverseDepthY"],
  [controls.inverseInnerRound, "inverseInnerRound"],
  [controls.inverseOuterRound, "inverseOuterRound"],
  [controls.radialRadius, "radialRadius"],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatRem = (value) => Number(value.toFixed(2)).toString();
const formatCoef = (value) => Number(value.toFixed(8)).toString();
let layoutFitFrame = 0;

function fitPanelsToViewport() {
  if (!appRoot || !controlsPanel) return;

  const rootStyle = document.documentElement.style;
  if (stackedLayoutQuery.matches) {
    rootStyle.removeProperty("--tools-height");
    rootStyle.removeProperty("--app-offsets-y");
    rootStyle.removeProperty("--right-col-gap");
    return;
  }

  const appStyles = window.getComputedStyle(appRoot);
  const paddingTop = Number.parseFloat(appStyles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(appStyles.paddingBottom) || 0;
  const rowGap = Number.parseFloat(appStyles.rowGap || appStyles.gap) || 0;
  const toolsHeight = controlsPanel.offsetHeight;

  rootStyle.setProperty("--tools-height", `${toolsHeight}px`);
  rootStyle.setProperty("--app-offsets-y", `${paddingTop + paddingBottom}px`);
  rootStyle.setProperty("--right-col-gap", `${rowGap}px`);
}

function schedulePanelsFit() {
  if (layoutFitFrame) {
    window.cancelAnimationFrame(layoutFitFrame);
  }

  layoutFitFrame = window.requestAnimationFrame(() => {
    layoutFitFrame = 0;
    fitPanelsToViewport();
  });
}

function cornerVar(name, corner) {
  return `var(--${name}-${corner})`;
}

function scaledCornerVar(name, corner, coef) {
  const value = clamp(coef, 0, 1);
  const source = cornerVar(name, corner);

  if (value <= 0.0000001) return "0rem";
  if (value >= 0.9999999) return source;
  return `calc(${source} * ${formatCoef(value)})`;
}

function quarterArc(pointBuilder) {
  const points = [];
  for (let i = 1; i < ARC_SEGMENTS; i += 1) {
    const u = (Math.PI / 2) * (i / ARC_SEGMENTS);
    points.push(pointBuilder(Math.cos(u), Math.sin(u)));
  }
  return points;
}

function chamferTopRight(corner) {
  const cx = cornerVar("cx", corner);
  const cy = cornerVar("cy", corner);
  const dx = cornerVar("dx", corner);
  const dy = cornerVar("dy", corner);
  const ax = cornerVar("ax", corner);
  const ay = cornerVar("ay", corner);
  const bx = cornerVar("bx", corner);
  const by = cornerVar("by", corner);
  const ux = cornerVar("ux", corner);
  const uy = cornerVar("uy", corner);

  return [
    `calc(100% - ${cx} - ${dx}) 0`,
    `calc(100% - ${cx} - ${ax}) ${by}`,
    `calc(100% - ${cx} + ${ux}) ${uy}`,
    `calc(100% - ${ux}) calc(${cy} - ${uy})`,
    `calc(100% - ${bx}) calc(${cy} + ${ay})`,
    `100% calc(${cy} + ${dy})`,
  ];
}

function chamferBottomRight(corner) {
  const cx = cornerVar("cx", corner);
  const cy = cornerVar("cy", corner);
  const dx = cornerVar("dx", corner);
  const dy = cornerVar("dy", corner);
  const ax = cornerVar("ax", corner);
  const ay = cornerVar("ay", corner);
  const bx = cornerVar("bx", corner);
  const by = cornerVar("by", corner);
  const ux = cornerVar("ux", corner);
  const uy = cornerVar("uy", corner);

  return [
    `100% calc(100% - ${cy} - ${dy})`,
    `calc(100% - ${bx}) calc(100% - ${cy} - ${ay})`,
    `calc(100% - ${ux}) calc(100% - ${cy} + ${uy})`,
    `calc(100% - ${cx} + ${ux}) calc(100% - ${uy})`,
    `calc(100% - ${cx} - ${ax}) calc(100% - ${by})`,
    `calc(100% - ${cx} - ${dx}) 100%`,
  ];
}

function chamferBottomLeft(corner) {
  const cx = cornerVar("cx", corner);
  const cy = cornerVar("cy", corner);
  const dx = cornerVar("dx", corner);
  const dy = cornerVar("dy", corner);
  const ax = cornerVar("ax", corner);
  const ay = cornerVar("ay", corner);
  const bx = cornerVar("bx", corner);
  const by = cornerVar("by", corner);
  const ux = cornerVar("ux", corner);
  const uy = cornerVar("uy", corner);

  return [
    `calc(${cx} + ${dx}) 100%`,
    `calc(${cx} + ${ax}) calc(100% - ${by})`,
    `calc(${cx} - ${ux}) calc(100% - ${uy})`,
    `${ux} calc(100% - ${cy} + ${uy})`,
    `${bx} calc(100% - ${cy} - ${ay})`,
    `0 calc(100% - ${cy} - ${dy})`,
  ];
}

function chamferTopLeftFromLeft(corner) {
  const cx = cornerVar("cx", corner);
  const cy = cornerVar("cy", corner);
  const dx = cornerVar("dx", corner);
  const dy = cornerVar("dy", corner);
  const ax = cornerVar("ax", corner);
  const ay = cornerVar("ay", corner);
  const bx = cornerVar("bx", corner);
  const by = cornerVar("by", corner);
  const ux = cornerVar("ux", corner);
  const uy = cornerVar("uy", corner);

  return [
    `0 calc(${cy} + ${dy})`,
    `${bx} calc(${cy} + ${ay})`,
    `${ux} calc(${cy} - ${uy})`,
    `calc(${cx} - ${ux}) ${uy}`,
    `calc(${cx} + ${ax}) ${by}`,
  ];
}

function inverseTopRight(corner) {
  const idx = cornerVar("idx", corner);
  const idy = cornerVar("idy", corner);
  const inrx = cornerVar("inrx", corner);
  const inry = cornerVar("inry", corner);
  const iorx = cornerVar("iorx", corner);
  const iory = cornerVar("iory", corner);

  return [
    `calc(100% - ${idx} - ${iorx}) 0`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${idx} - ${iorx} + ${scaledCornerVar("iorx", corner, s)}) calc(${iory} - ${scaledCornerVar("iory", corner, c)})`
    ),
    `calc(100% - ${idx}) ${iory}`,
    `calc(100% - ${idx}) calc(${idy} - ${inry})`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${idx} + ${scaledCornerVar("inrx", corner, 1 - c)}) calc(${idy} - ${inry} + ${scaledCornerVar("inry", corner, s)})`
    ),
    `calc(100% - ${idx} + ${inrx}) ${idy}`,
    `calc(100% - ${iorx}) ${idy}`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${iorx} + ${scaledCornerVar("iorx", corner, s)}) calc(${idy} + ${scaledCornerVar("iory", corner, 1 - c)})`
    ),
    `100% calc(${idy} + ${iory})`,
  ];
}

function inverseBottomRight(corner) {
  const idx = cornerVar("idx", corner);
  const idy = cornerVar("idy", corner);
  const inrx = cornerVar("inrx", corner);
  const inry = cornerVar("inry", corner);
  const iorx = cornerVar("iorx", corner);
  const iory = cornerVar("iory", corner);

  return [
    `100% calc(100% - ${idy} - ${iory})`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${iorx} + ${scaledCornerVar("iorx", corner, c)}) calc(100% - ${idy} - ${iory} + ${scaledCornerVar("iory", corner, s)})`
    ),
    `calc(100% - ${iorx}) calc(100% - ${idy})`,
    `calc(100% - ${idx} + ${inrx}) calc(100% - ${idy})`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${idx} + ${inrx} - ${scaledCornerVar("inrx", corner, s)}) calc(100% - ${idy} + ${inry} - ${scaledCornerVar("inry", corner, c)})`
    ),
    `calc(100% - ${idx}) calc(100% - ${idy} + ${inry})`,
    `calc(100% - ${idx}) calc(100% - ${iory})`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${idx} - ${iorx} + ${scaledCornerVar("iorx", corner, c)}) calc(100% - ${iory} + ${scaledCornerVar("iory", corner, s)})`
    ),
    `calc(100% - ${idx} - ${iorx}) 100%`,
  ];
}

function inverseBottomLeft(corner) {
  const idx = cornerVar("idx", corner);
  const idy = cornerVar("idy", corner);
  const inrx = cornerVar("inrx", corner);
  const inry = cornerVar("inry", corner);
  const iorx = cornerVar("iorx", corner);
  const iory = cornerVar("iory", corner);

  return [
    `calc(${idx} + ${iorx}) 100%`,
    ...quarterArc(
      (c, s) =>
        `calc(${idx} + ${iorx} - ${scaledCornerVar("iorx", corner, s)}) calc(100% - ${iory} + ${scaledCornerVar("iory", corner, c)})`
    ),
    `${idx} calc(100% - ${iory})`,
    `${idx} calc(100% - ${idy} + ${inry})`,
    ...quarterArc(
      (c, s) =>
        `calc(${idx} - ${scaledCornerVar("inrx", corner, 1 - c)}) calc(100% - ${idy} + ${scaledCornerVar("inry", corner, 1 - s)})`
    ),
    `calc(${idx} - ${inrx}) calc(100% - ${idy})`,
    `${iorx} calc(100% - ${idy})`,
    ...quarterArc(
      (c, s) =>
        `calc(${iorx} - ${scaledCornerVar("iorx", corner, s)}) calc(100% - ${idy} - ${scaledCornerVar("iory", corner, 1 - c)})`
    ),
    `0 calc(100% - ${idy} - ${iory})`,
  ];
}

function inverseTopLeftFromLeft(corner) {
  const idx = cornerVar("idx", corner);
  const idy = cornerVar("idy", corner);
  const inrx = cornerVar("inrx", corner);
  const inry = cornerVar("inry", corner);
  const iorx = cornerVar("iorx", corner);
  const iory = cornerVar("iory", corner);

  return [
    `0 calc(${idy} + ${iory})`,
    ...quarterArc(
      (c, s) =>
        `calc(${iorx} - ${scaledCornerVar("iorx", corner, c)}) calc(${idy} + ${iory} - ${scaledCornerVar("iory", corner, s)})`
    ),
    `${iorx} ${idy}`,
    `calc(${idx} - ${inrx}) ${idy}`,
    ...quarterArc(
      (c, s) =>
        `calc(${idx} - ${inrx} + ${scaledCornerVar("inrx", corner, s)}) calc(${idy} - ${inry} + ${scaledCornerVar("inry", corner, c)})`
    ),
    `${idx} calc(${idy} - ${inry})`,
    `${idx} ${iory}`,
    ...quarterArc(
      (c, s) =>
        `calc(${idx} + ${iorx} - ${scaledCornerVar("iorx", corner, c)}) calc(${iory} - ${scaledCornerVar("iory", corner, s)})`
    ),
    `calc(${idx} + ${iorx}) 0`,
  ];
}

function radialTopRight(corner) {
  const radx = cornerVar("radx", corner);
  const rady = cornerVar("rady", corner);

  return [
    `calc(100% - ${radx}) 0`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${radx} + ${scaledCornerVar("radx", corner, s)}) calc(${rady} - ${scaledCornerVar("rady", corner, c)})`
    ),
    `100% ${rady}`,
  ];
}

function radialBottomRight(corner) {
  const radx = cornerVar("radx", corner);
  const rady = cornerVar("rady", corner);

  return [
    `100% calc(100% - ${rady})`,
    ...quarterArc(
      (c, s) =>
        `calc(100% - ${radx} + ${scaledCornerVar("radx", corner, c)}) calc(100% - ${rady} + ${scaledCornerVar("rady", corner, s)})`
    ),
    `calc(100% - ${radx}) 100%`,
  ];
}

function radialBottomLeft(corner) {
  const radx = cornerVar("radx", corner);
  const rady = cornerVar("rady", corner);

  return [
    `${radx} 100%`,
    ...quarterArc(
      (c, s) =>
        `calc(${radx} - ${scaledCornerVar("radx", corner, s)}) calc(100% - ${rady} + ${scaledCornerVar("rady", corner, c)})`
    ),
    `0 calc(100% - ${rady})`,
  ];
}

function radialTopLeftFromLeft(corner) {
  const radx = cornerVar("radx", corner);
  const rady = cornerVar("rady", corner);

  return [
    `0 ${rady}`,
    ...quarterArc(
      (c, s) =>
        `calc(${radx} - ${scaledCornerVar("radx", corner, c)}) calc(${rady} - ${scaledCornerVar("rady", corner, s)})`
    ),
    `${radx} 0`,
  ];
}

function effectiveMode(corner) {
  const settings = state.corners[corner];

  if (settings.mode === "chamfer") {
    return settings.cut > 0 ? "chamfer" : "plain";
  }

  if (settings.mode === "inverse") {
    if (settings.inverseDepthX <= 0 || settings.inverseDepthY <= 0) return "plain";
    return "inverse";
  }

  if (settings.mode === "radial") {
    return settings.radialRadius > 0 ? "radial" : "plain";
  }

  return "plain";
}

function getEffectiveModes() {
  return {
    tl: effectiveMode("tl"),
    tr: effectiveMode("tr"),
    br: effectiveMode("br"),
    bl: effectiveMode("bl"),
  };
}

function buildPolygon(mode = getEffectiveModes()) {

  const points = [];

  if (mode.tl === "plain") points.push("0 0");
  if (mode.tl === "chamfer") points.push(`calc(${cornerVar("cx", "tl")} + ${cornerVar("dx", "tl")}) 0`);
  if (mode.tl === "inverse") points.push(`calc(${cornerVar("idx", "tl")} + ${cornerVar("iorx", "tl")}) 0`);
  if (mode.tl === "radial") points.push(`${cornerVar("radx", "tl")} 0`);

  if (mode.tr === "plain") points.push("100% 0");
  if (mode.tr === "chamfer") points.push(...chamferTopRight("tr"));
  if (mode.tr === "inverse") points.push(...inverseTopRight("tr"));
  if (mode.tr === "radial") points.push(...radialTopRight("tr"));

  if (mode.br === "plain") points.push("100% 100%");
  if (mode.br === "chamfer") points.push(...chamferBottomRight("br"));
  if (mode.br === "inverse") points.push(...inverseBottomRight("br"));
  if (mode.br === "radial") points.push(...radialBottomRight("br"));

  if (mode.bl === "plain") points.push("0 100%");
  if (mode.bl === "chamfer") points.push(...chamferBottomLeft("bl"));
  if (mode.bl === "inverse") points.push(...inverseBottomLeft("bl"));
  if (mode.bl === "radial") points.push(...radialBottomLeft("bl"));

  if (mode.tl === "chamfer") points.push(...chamferTopLeftFromLeft("tl"));
  if (mode.tl === "inverse") points.push(...inverseTopLeftFromLeft("tl"));
  if (mode.tl === "radial") points.push(...radialTopLeftFromLeft("tl"));

  return `polygon(\n    ${points.join(",\n    ")}\n  )`;
}

function cornerSummary(corner, modes) {
  return `${corner.toUpperCase()}=${modes[corner]}`;
}

function modeSummary(modes) {
  return CORNERS.map((corner) => cornerSummary(corner, modes)).join(", ");
}

function getCornerVariables(corner) {
  const settings = state.corners[corner];

  return {
    [`--cut-${corner}`]: `${formatRem(settings.cut)}rem`,
    [`--cut-round-${corner}`]: `${formatRem(settings.cutRound)}rem`,
    [`--cx-${corner}`]: `min(var(--cut-${corner}), 48%)`,
    [`--cy-${corner}`]: `min(var(--cut-${corner}), 48%)`,
    [`--dx-${corner}`]: `max(0rem, min(calc(var(--cut-round-${corner}) * 0.41421356), calc(var(--cx-${corner}) * 0.68)))`,
    [`--dy-${corner}`]: `max(0rem, min(calc(var(--cut-round-${corner}) * 0.41421356), calc(var(--cy-${corner}) * 0.68)))`,
    [`--ux-${corner}`]: `calc(var(--dx-${corner}) * 0.70710678)`,
    [`--uy-${corner}`]: `calc(var(--dy-${corner}) * 0.70710678)`,
    [`--ax-${corner}`]: `calc(var(--dx-${corner}) * 0.07612047)`,
    [`--ay-${corner}`]: `calc(var(--dy-${corner}) * 0.07612047)`,
    [`--bx-${corner}`]: `calc(var(--dx-${corner}) * 0.18386400)`,
    [`--by-${corner}`]: `calc(var(--dy-${corner}) * 0.18386400)`,
    [`--inverse-depth-x-${corner}`]: `${formatRem(settings.inverseDepthX)}rem`,
    [`--inverse-depth-y-${corner}`]: `${formatRem(settings.inverseDepthY)}rem`,
    [`--inverse-inner-round-${corner}`]: `${formatRem(settings.inverseInnerRound)}rem`,
    [`--inverse-outer-round-${corner}`]: `${formatRem(settings.inverseOuterRound)}rem`,
    [`--idx-${corner}`]: `min(var(--inverse-depth-x-${corner}), 48%)`,
    [`--idy-${corner}`]: `min(var(--inverse-depth-y-${corner}), 48%)`,
    [`--iorx-${corner}`]: `max(0rem, min(var(--inverse-outer-round-${corner}), var(--idx-${corner})))`,
    [`--iory-${corner}`]: `max(0rem, min(var(--inverse-outer-round-${corner}), var(--idy-${corner})))`,
    [`--inrx-${corner}`]: `max(0rem, min(var(--inverse-inner-round-${corner}), calc(var(--idx-${corner}) - var(--iorx-${corner}))))`,
    [`--inry-${corner}`]: `max(0rem, min(var(--inverse-inner-round-${corner}), calc(var(--idy-${corner}) - var(--iory-${corner}))))`,
    [`--radial-radius-${corner}`]: `${formatRem(settings.radialRadius)}rem`,
    [`--radx-${corner}`]: `min(var(--radial-radius-${corner}), 48%)`,
    [`--rady-${corner}`]: `min(var(--radial-radius-${corner}), 48%)`,
  };
}

const MODE_VARIABLE_NAMES = {
  plain: [],
  chamfer: ["cut", "cut-round", "cx", "cy", "dx", "dy", "ux", "uy", "ax", "ay", "bx", "by"],
  inverse: [
    "inverse-depth-x",
    "inverse-depth-y",
    "inverse-inner-round",
    "inverse-outer-round",
    "idx",
    "idy",
    "iorx",
    "iory",
    "inrx",
    "inry",
  ],
  radial: ["radial-radius", "radx", "rady"],
};

function getCornerVariablesByMode(corner, mode) {
  const names = MODE_VARIABLE_NAMES[mode] || [];
  if (!names.length) return [];

  const all = getCornerVariables(corner);
  return names
    .map((name) => {
      const variable = `--${name}-${corner}`;
      return [variable, all[variable]];
    })
    .filter(([, value]) => value !== undefined);
}

function applyCornerVariables(element, corner) {
  const vars = getCornerVariables(corner);
  Object.entries(vars).forEach(([name, value]) => {
    element.style.setProperty(name, value);
  });
}

function getSelectedCornerSettings() {
  if (!state.selectedCorner) return null;
  return state.corners[state.selectedCorner];
}

function setPerCornerInputsDisabled(disabled) {
  CORNER_INPUT_BINDINGS.forEach(([input]) => {
    input.disabled = disabled;
  });
}

function syncModeGroups() {
  const selected = getSelectedCornerSettings();
  const mode = selected ? selected.mode : "none";
  modeGroups.forEach((group) => {
    group.hidden = group.dataset.modeGroup !== mode;
  });
}

function syncCornerUi() {
  cornerTabButtons.forEach((button) => {
    const isActive = button.dataset.selectCorner === state.selectedCorner;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const selected = getSelectedCornerSettings();
  const mode = selected ? selected.mode : null;
  modeButtons.forEach((button) => {
    button.disabled = !selected;
    const isActive = button.dataset.modeButton === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  activeCornerName.textContent = selected ? CORNER_LABELS[state.selectedCorner] : NO_CORNER_LABEL;
  syncModeGroups();
  schedulePanelsFit();
}

function updateOutputs() {
  outputs.corner.textContent = `${formatRem(state.corner)}rem`;

  const selected = getSelectedCornerSettings();
  if (!selected) {
    outputs.cut.textContent = "—";
    outputs.cutRound.textContent = "—";
    outputs.inverseDepthX.textContent = "—";
    outputs.inverseDepthY.textContent = "—";
    outputs.inverseInnerRound.textContent = "—";
    outputs.inverseOuterRound.textContent = "—";
    outputs.radialRadius.textContent = "—";
    return;
  }

  outputs.cut.textContent = `${formatRem(selected.cut)}rem`;
  outputs.cutRound.textContent = `${formatRem(selected.cutRound)}rem`;
  outputs.inverseDepthX.textContent = `${formatRem(selected.inverseDepthX)}rem`;
  outputs.inverseDepthY.textContent = `${formatRem(selected.inverseDepthY)}rem`;
  outputs.inverseInnerRound.textContent = `${formatRem(selected.inverseInnerRound)}rem`;
  outputs.inverseOuterRound.textContent = `${formatRem(selected.inverseOuterRound)}rem`;
  outputs.radialRadius.textContent = `${formatRem(selected.radialRadius)}rem`;
}

function syncInputsFromSelectedCorner() {
  const selected = getSelectedCornerSettings();
  if (!selected) {
    setPerCornerInputsDisabled(true);
    updateOutputs();
    return;
  }

  setPerCornerInputsDisabled(false);

  controls.cut.value = selected.cut;
  controls.cutRound.value = selected.cutRound;
  controls.inverseDepthX.value = selected.inverseDepthX;
  controls.inverseDepthY.value = selected.inverseDepthY;
  controls.inverseInnerRound.value = selected.inverseInnerRound;
  controls.inverseOuterRound.value = selected.inverseOuterRound;
  controls.radialRadius.value = selected.radialRadius;

  updateOutputs();
}

function renderPreview() {
  const polygon = buildPolygon();

  previewCard.style.setProperty("--corner", `${formatRem(state.corner)}rem`);
  previewCard.style.setProperty("--fill", state.color);

  CORNERS.forEach((corner) => {
    applyCornerVariables(previewCard, corner);
  });

  previewCard.style.setProperty("--shape-clip", polygon);
}

function buildCssLines(modes) {
  const lines = [];

  lines.push(`  --corner: ${formatRem(state.corner)}rem;`);
  CORNERS.forEach((corner) => {
    const mode = modes[corner];
    if (mode === "plain") return;

    const vars = getCornerVariablesByMode(corner, mode);
    if (!vars.length) return;

    lines.push(`  /* ${CORNER_LABELS[corner]} (${mode}) */`);
    vars.forEach(([name, value]) => {
      lines.push(`  ${name}: ${value};`);
    });
  });

  return lines;
}

function getCopyDefaultLabel() {
  return state.codeFormat === "scss" ? "Копировать SCSS" : "Копировать CSS";
}

function syncCodeFormatUi() {
  codeTabButtons.forEach((button) => {
    const isActive = button.dataset.codeFormat === state.codeFormat;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  copyBtn.textContent = getCopyDefaultLabel();
}

function buildCssCode(modes, polygon, cssLines) {
  return [
    `/* режимы углов: ${modeSummary(modes)} */`,
    ".mask-card {",
    ...cssLines,
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
}

function buildScssCode(modes, polygon, cssLines) {
  return [
    `/* режимы углов: ${modeSummary(modes)} */`,
    `$mask-fill: ${state.color};`,
    "",
    ".mask-card {",
    ...cssLines,
    `  --shape-clip: ${polygon};`,
    "",
    "  position: relative;",
    "  border-radius: min(var(--corner), 48%);",
    "  overflow: hidden;",
    "",
    "  &::before {",
    '    content: "";',
    "    position: absolute;",
    "    inset: 0;",
    "    background: $mask-fill;",
    "    clip-path: var(--shape-clip);",
    "    -webkit-clip-path: var(--shape-clip);",
    "  }",
    "",
    "  > * {",
    "    position: relative;",
    "    z-index: 1;",
    "  }",
    "}",
  ].join("\n");
}

function updateCode() {
  const modes = getEffectiveModes();
  const polygon = buildPolygon(modes);
  const cssLines = buildCssLines(modes);

  const codes = {
    css: buildCssCode(modes, polygon, cssLines),
    scss: buildScssCode(modes, polygon, cssLines),
  };

  codeOutput.textContent = codes[state.codeFormat] || codes.css;
  syncCodeFormatUi();
}

function renderAll() {
  updateOutputs();
  renderPreview();
  updateCode();
  schedulePanelsFit();
}

function ensureModeDefaults(corner) {
  const settings = state.corners[corner];

  if (settings.mode === "chamfer") {
    if (settings.cut <= 0) settings.cut = 4.2;
  }

  if (settings.mode === "inverse") {
    if (settings.inverseDepthX <= 0) settings.inverseDepthX = 3;
    if (settings.inverseDepthY <= 0) settings.inverseDepthY = 3;
  }

  if (settings.mode === "radial") {
    if (settings.radialRadius <= 0) settings.radialRadius = 3;
  }
}

function setCornerMode(mode) {
  if (!MODES.includes(mode) || !state.selectedCorner) return;

  state.corners[state.selectedCorner].mode = mode;
  ensureModeDefaults(state.selectedCorner);

  syncCornerUi();
  syncInputsFromSelectedCorner();
  renderPreview();
  updateCode();
}

function setCodeFormat(format) {
  if (!CODE_FORMATS.includes(format)) return;
  state.codeFormat = format;
  updateCode();
  schedulePanelsFit();
}

function resetState() {
  const initial = createInitialState();

  state.corner = initial.corner;
  state.color = initial.color;
  state.codeFormat = initial.codeFormat;
  state.selectedCorner = initial.selectedCorner;
  CORNERS.forEach((corner) => {
    state.corners[corner] = { ...initial.corners[corner] };
  });

  controls.corner.value = String(state.corner);
  controls.color.value = state.color;

  syncCornerUi();
  syncInputsFromSelectedCorner();
  renderAll();
}

async function copyText(content, onSuccessLabel, onResetLabel, targetButton) {
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    targetButton.textContent = onSuccessLabel;
  } catch (_) {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    targetButton.textContent = onSuccessLabel;
  }

  window.setTimeout(() => {
    targetButton.textContent = onResetLabel();
  }, 900);
}

async function copyCode() {
  const content = codeOutput.textContent || "";
  await copyText(content, "Скопировано", getCopyDefaultLabel, copyBtn);
}

controls.corner.addEventListener("input", () => {
  state.corner = Number(controls.corner.value);
  renderAll();
});

controls.color.addEventListener("input", () => {
  state.color = controls.color.value;
  renderAll();
});

CORNER_INPUT_BINDINGS.forEach(([input, key]) => {
  input.addEventListener("input", () => {
    if (!state.selectedCorner) return;
    state.corners[state.selectedCorner][key] = Number(input.value);
    renderAll();
  });
});

cornerTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const corner = button.dataset.selectCorner;
    if (!CORNERS.includes(corner)) return;

    state.selectedCorner = state.selectedCorner === corner ? null : corner;
    syncCornerUi();
    syncInputsFromSelectedCorner();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCornerMode(button.dataset.modeButton);
  });
});

codeTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCodeFormat(button.dataset.codeFormat);
  });
});

copyBtn.addEventListener("click", copyCode);
resetBtn.addEventListener("click", resetState);

window.addEventListener("resize", schedulePanelsFit);
if (typeof stackedLayoutQuery.addEventListener === "function") {
  stackedLayoutQuery.addEventListener("change", schedulePanelsFit);
} else if (typeof stackedLayoutQuery.addListener === "function") {
  stackedLayoutQuery.addListener(schedulePanelsFit);
}

syncCornerUi();
syncInputsFromSelectedCorner();
renderPreview();
updateCode();
schedulePanelsFit();

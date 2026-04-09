const DATA_URL = "./data.json";
const THEME_KEY = "kilo-speedway-theme";

const state = {
  rows: [],
  event: "ALL",
  day: "ALL",
  search: "",
  category: "ALL",
  box: "ALL",
  liveOnly: false,
  sort: "time",
  sortDir: "asc"
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const el = {
  searchInput: $("#searchInput"),
  categorySelect: $("#categorySelect"),
  boxSelect: $("#boxSelect"),
  sortSelect: $("#sortSelect"),
  clearBtn: $("#clearBtn"),
  liveOnlyBtn: $("#liveOnlyBtn"),
  shareBtn: $("#shareBtn"),
  dayTabs: $("#dayTabs"),
  eventTabs: $("#eventTabs"),
  livePanel: $("#livePanel"),
  cards: $("#cards"),
  tableBody: $("#tableBody")
};

const normalize = (v="") =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function parseHoraToMs(txt=""){
  const m = String(txt).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if(!m) return Number.MAX_SAFE_INTEGER;
  let [,dd,mm,yy,hh,min,ampm] = m;
  let h = parseInt(hh,10);
  if(ampm.toLowerCase()==="pm" && h!==12) h += 12;
  if(ampm.toLowerCase()==="am" && h===12) h = 0;
  return new Date(+yy, +mm-1, +dd, h, +min).getTime();
}

function parseHoraParts(txt=""){
  const m = String(txt).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if(!m) return null;
  let [,dd,mm,yy,hh,min,ampm] = m;
  let h = parseInt(hh,10);
  if(ampm.toLowerCase()==="pm" && h!==12) h += 12;
  if(ampm.toLowerCase()==="am" && h===12) h = 0;
  return {
    dd: Number(dd),
    mm: Number(mm),
    yy: Number(yy),
    h,
    min: Number(min)
  };
}

function getDayKey(txt=""){
  const parts = parseHoraParts(txt);
  if(!parts) return "unknown";
  return `${parts.yy}-${String(parts.mm).padStart(2,"0")}-${String(parts.dd).padStart(2,"0")}`;
}

function getDayLabel(dayKey){
  if(dayKey === "ALL") return "Todos";
  const [yy,mm,dd] = dayKey.split("-").map(Number);
  const date = new Date(yy, mm - 1, dd, 12, 0, 0);
  const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function getHeatKey(row){
  return [
    row.hora_heat || "",
    row.evento || "",
    row.categoria || "",
    row.heat || ""
  ].join("|");
}

function copyShareUrl(){
  const url = new URL(window.location.href);
  const setOrDelete = (key, value, emptyValue="ALL") => {
    if(!value || value === emptyValue) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };

  setOrDelete("day", state.day);
  setOrDelete("event", state.event);
  setOrDelete("category", state.category);
  setOrDelete("box", state.box);
  setOrDelete("sort", state.sort, "time");

  if(state.search) url.searchParams.set("search", state.search);
  else url.searchParams.delete("search");

  if(state.liveOnly) url.searchParams.set("live", "1");
  else url.searchParams.delete("live");

  const finalUrl = url.toString();
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(finalUrl).then(() => {
      el.shareBtn.textContent = "Link copiado";
      setTimeout(() => {
        el.shareBtn.textContent = "Compartir este filtro";
      }, 1800);
    }).catch(() => {
      window.prompt("Copia este link", finalUrl);
    });
    return;
  }

  window.prompt("Copia este link", finalUrl);
}

function syncUrlState(){
  const url = new URL(window.location.href);
  const setOrDelete = (key, value, emptyValue="ALL") => {
    if(!value || value === emptyValue) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };

  setOrDelete("day", state.day);
  setOrDelete("event", state.event);
  setOrDelete("category", state.category);
  setOrDelete("box", state.box);
  setOrDelete("sort", state.sort, "time");

  if(state.search) url.searchParams.set("search", state.search);
  else url.searchParams.delete("search");

  if(state.liveOnly) url.searchParams.set("live", "1");
  else url.searchParams.delete("live");

  window.history.replaceState({}, "", url);
}

function hydrateStateFromUrl(){
  const params = new URLSearchParams(window.location.search);
  state.day = params.get("day") || "ALL";
  state.event = params.get("event") || "ALL";
  state.search = params.get("search") || "";
  state.category = params.get("category") || "ALL";
  state.box = params.get("box") || "ALL";
  state.sort = params.get("sort") || "time";
  state.liveOnly = params.get("live") === "1";
}

function buildScheduleMeta(rows){
  const groups = new Map();

  rows.forEach(row => {
    const key = getHeatKey(row);
    if(groups.has(key)) return;
    groups.set(key, {
      key,
      hora_heat: row.hora_heat || "",
      evento: row.evento || "",
      categoria: row.categoria || "",
      heat: row.heat || "",
      lane: row.lane || "",
      timeMs: parseHoraToMs(row.hora_heat),
      dayKey: getDayKey(row.hora_heat)
    });
  });

  const schedule = [...groups.values()]
    .filter(item => Number.isFinite(item.timeMs))
    .sort((a,b) => a.timeMs - b.timeMs || String(a.heat).localeCompare(String(b.heat), "es"));

  schedule.forEach((item, idx) => {
    const next = schedule[idx + 1];
    item.endMs = next ? next.timeMs : item.timeMs + 30 * 60 * 1000;
  });

  return schedule;
}

function getRowStatus(row){
  const now = Date.now();
  const key = getHeatKey(row);
  const slot = state.schedule.find(item => item.key === key);
  if(!slot) return "upcoming";
  if(now >= slot.timeMs && now < slot.endMs) return "live";
  if(now >= slot.endMs) return "past";
  return "upcoming";
}

function renderDayTabs(){
  const days = ["ALL", ...new Set(state.rows.map(row => getDayKey(row.hora_heat)).filter(Boolean))];
  el.dayTabs.innerHTML = days.map(day => `
    <button class="day-tab ${state.day===day ? "active" : ""}" data-day="${day}">
      ${getDayLabel(day)}
    </button>
  `).join("");

  $$(".day-tab").forEach(btn => {
    btn.onclick = () => {
      state.day = btn.dataset.day;
      render();
    };
  });
}

function uniques(key){
  return [...new Set(state.rows.map(r => String(r[key] || "").trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, "es"));
}

function fillSelect(select, values, allLabel){
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "ALL";
  all.textContent = allLabel;
  select.appendChild(all);

  values.forEach(v => {
    const op = document.createElement("option");
    op.value = v;
    op.textContent = v;
    select.appendChild(op);
  });
}

function initFilters(){
  fillSelect(el.categorySelect, uniques("categoria"), "Todas las categorías");
  fillSelect(el.boxSelect, uniques("box"), "Todos los boxes");
}

function renderTabs(){
  const events = ["ALL", ...uniques("evento")];
  el.eventTabs.innerHTML = events.map(evt => `
    <button class="tab ${state.event===evt ? "active" : ""}" data-event="${evt}">
      ${evt==="ALL" ? "Todos" : evt}
    </button>
  `).join("");
}

function filteredData(){
  const q = normalize(state.search);

  const arr = state.rows.filter(r => {
    if(state.day !== "ALL" && getDayKey(r.hora_heat) !== state.day) return false;
    if(state.event !== "ALL" && r.evento !== state.event) return false;
    if(state.category !== "ALL" && r.categoria !== state.category) return false;
    if(state.box !== "ALL" && r.box !== state.box) return false;
    if(state.liveOnly && getRowStatus(r) !== "live") return false;
    if(!q) return true;

    const target = [
      r.atleta1, r.atleta2, r.equipo, r.box, r.evento, r.categoria, r.lane, r.numero
    ].map(normalize).join(" | ");

    return target.includes(q);
  });

  arr.sort((a,b) => {
    const dir = state.sortDir === "asc" ? 1 : -1;

    if(state.sort === "time"){
      return (
        (parseHoraToMs(a.hora_heat) - parseHoraToMs(b.hora_heat)) * dir ||
        String(a.heat).localeCompare(String(b.heat), "es") * dir ||
        ((a.lane || 0) - (b.lane || 0)) * dir
      );
    }

    if(state.sort === "athlete"){
      return String(a.atleta1 || a.atleta2).localeCompare(String(b.atleta1 || b.atleta2), "es") * dir;
    }

    if(state.sort === "team"){
      return String(a.equipo || a.atleta1).localeCompare(String(b.equipo || b.atleta1), "es") * dir;
    }

    if(state.sort === "lane"){
      return ((a.lane || 0) - (b.lane || 0)) * dir || (parseHoraToMs(a.hora_heat) - parseHoraToMs(b.hora_heat)) * dir;
    }

    return 0;
  });

  return arr;
}

function getLiveSummary(rows){
  const now = Date.now();
  const visibleKeys = new Set(rows.map(getHeatKey));
  const relevant = state.schedule.filter(item => visibleKeys.has(item.key));

  const live = relevant.find(item => now >= item.timeMs && now < item.endMs);
  if(live){
    return { mode: "live", slot: live };
  }

  const next = relevant.find(item => item.timeMs > now);
  if(next){
    return { mode: "next", slot: next };
  }

  const last = relevant[relevant.length - 1];
  if(last){
    return { mode: "done", slot: last };
  }

  return null;
}

function renderLivePanel(rows){
  const summary = getLiveSummary(rows);
  if(!summary){
    el.livePanel.className = "live-panel";
    el.livePanel.innerHTML = `<div class="live-text">No hay heats visibles con los filtros actuales.</div>`;
    return;
  }

  const { mode, slot } = summary;
  const modeClass = mode === "live" ? "live-now" : "live-next";
  const kicker = mode === "live" ? "Ahora en vivo" : mode === "next" ? "Próximo heat" : "Jornada terminada";
  const text = mode === "live"
    ? "Se destaca según la hora local del dispositivo desde donde se está viendo."
    : mode === "next"
      ? "Este será el siguiente bloque visible según la hora local del dispositivo."
      : "Todos los heats visibles para este día ya pasaron.";

  el.livePanel.className = `live-panel ${modeClass}`;
  el.livePanel.innerHTML = `
    <div class="live-kicker">${kicker}</div>
    <div class="live-title">${slot.evento || "Heat"} · ${slot.heat || "-"}</div>
    <div class="live-meta">
      <span class="live-pill">${getDayLabel(slot.dayKey)}</span>
      <span class="live-pill">${slot.hora_heat || "-"}</span>
      <span class="live-pill">${slot.categoria || "-"}</span>
    </div>
    <div class="live-text">${text}</div>
  `;
}

function renderCards(rows){
  if(!rows.length){
    el.cards.innerHTML = `<div class="empty">No se encontraron resultados con esos filtros.</div>`;
    return;
  }

  el.cards.innerHTML = rows.map(r => `
    <article class="card ${getRowStatus(r)==="past" ? "is-past" : ""} ${getRowStatus(r)==="live" ? "is-live" : ""}">
      <div class="card-top">
        <div class="badges">
          <span class="badge event">${r.evento || "-"}</span>
          <span class="badge heat">${r.heat || "-"}</span>
          ${getRowStatus(r)==="live" ? `<span class="badge status-live">En vivo</span>` : ""}
          ${getRowStatus(r)==="past" ? `<span class="badge status-past">Finalizado</span>` : ""}
          ${getRowStatus(r)==="upcoming" ? `<span class="badge status-next">${getDayLabel(getDayKey(r.hora_heat))}</span>` : ""}
          ${r.box ? `<span class="badge box">${r.box}</span>` : ""}
        </div>

        <h3 class="team">${r.equipo || r.atleta1 || "Sin nombre"}</h3>

        <div class="meta">
          <div class="meta-item"><span>Hora inicio</span><strong>${r.hora_heat || "-"}</strong></div>
          <div class="meta-item"><span>Lane</span><strong>${r.lane || "-"}</strong></div>
          <div class="meta-item"><span>Categoría</span><strong>${r.categoria || "-"}</strong></div>
          <div class="meta-item"><span>País</span><strong>${r.pais || "-"}</strong></div>
        </div>
      </div>

      <div class="athletes">
        <div class="athlete"><small>Atleta 1</small><strong>${r.atleta1 || "-"}</strong></div>
        ${r.atleta2 ? `<div class="athlete"><small>Atleta 2</small><strong>${r.atleta2}</strong></div>` : ""}
      </div>
    </article>
  `).join("");
}

function renderTable(rows){
  if(!rows.length){
    el.tableBody.innerHTML = `<tr><td colspan="10"><div class="empty">No se encontraron resultados con esos filtros.</div></td></tr>`;
    return;
  }

  el.tableBody.innerHTML = rows.map(r => `
    <tr class="${getRowStatus(r)==="past" ? "row-past" : ""} ${getRowStatus(r)==="live" ? "row-live" : ""}">
      <td>${r.evento || "-"}</td>
      <td>${r.categoria || "-"}</td>
      <td>${r.heat || "-"}</td>
      <td>${r.hora_heat || "-"}</td>
      <td>${r.lane || "-"}</td>
      <td>${r.equipo || "-"}</td>
      <td>${r.pais || "-"}</td>
      <td>${r.box || "-"}</td>
      <td>${r.atleta1 || "-"}</td>
      <td>${r.atleta2 || "-"}</td>
    </tr>
  `).join("");
}

function bindTabEvents(){
  $$(".tab").forEach(btn => {
    btn.onclick = () => {
      state.event = btn.dataset.event;
      render();
    };
  });
}

function render(){
  const rows = filteredData();
  el.liveOnlyBtn.classList.toggle("is-active", state.liveOnly);
  renderDayTabs();
  renderTabs();
  renderLivePanel(rows);
  renderCards(rows);
  renderTable(rows);
  bindTabEvents();
  syncUrlState();
}

function bindEvents(){
  el.searchInput.addEventListener("input", e => {
    state.search = e.target.value;
    render();
  });

  el.categorySelect.addEventListener("change", e => {
    state.category = e.target.value;
    render();
  });

  el.boxSelect.addEventListener("change", e => {
    state.box = e.target.value;
    render();
  });

  el.sortSelect.addEventListener("change", e => {
    state.sort = e.target.value;
    render();
  });

  el.liveOnlyBtn.addEventListener("click", () => {
    state.liveOnly = !state.liveOnly;
    render();
  });

  el.shareBtn.addEventListener("click", () => {
    copyShareUrl();
  });

  el.clearBtn.addEventListener("click", () => {
    state.day = "ALL";
    state.event = "ALL";
    state.search = "";
    state.category = "ALL";
    state.box = "ALL";
    state.liveOnly = false;
    state.sort = "time";
    state.sortDir = "asc";

    el.searchInput.value = "";
    el.categorySelect.value = "ALL";
    el.boxSelect.value = "ALL";
    el.sortSelect.value = "time";

    render();
  });

  $$(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.body.classList.remove("theme-nitro","theme-crimson","theme-electric");
      document.body.classList.add(btn.dataset.theme);
      $$(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      localStorage.setItem(THEME_KEY, btn.dataset.theme);
    });
  });

  $$("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const map = {
        evento: "team",
        categoria: "team",
        heat: "time",
        hora_heat: "time",
        lane: "lane",
        equipo: "team",
        pais: "team",
        box: "team",
        atleta1: "athlete",
        atleta2: "athlete"
      };

      const next = map[th.dataset.sort] || "time";
      if(state.sort === next){
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sort = next;
        state.sortDir = "asc";
      }

      el.sortSelect.value = state.sort;
      render();
    });
  });
}

function restoreTheme(){
  const savedTheme = localStorage.getItem(THEME_KEY);
  if(!savedTheme) return;

  const target = $(`.theme-btn[data-theme="${savedTheme}"]`);
  if(!target) return;

  document.body.classList.remove("theme-nitro","theme-crimson","theme-electric");
  document.body.classList.add(savedTheme);
  $$(".theme-btn").forEach(btn => btn.classList.toggle("active", btn === target));
}

async function loadData(){
  try{
    const res = await fetch(DATA_URL);
    if(!res.ok) throw new Error("No se pudo abrir data.json");
    state.rows = await res.json();
    state.schedule = buildScheduleMeta(state.rows);
    hydrateStateFromUrl();

    initFilters();
    renderDayTabs();
    renderTabs();
    restoreTheme();
    bindEvents();

    el.searchInput.value = state.search;
    if([...el.categorySelect.options].some(op => op.value === state.category)) el.categorySelect.value = state.category;
    if([...el.boxSelect.options].some(op => op.value === state.box)) el.boxSelect.value = state.box;
    if([...el.sortSelect.options].some(op => op.value === state.sort)) el.sortSelect.value = state.sort;

    render();
    setInterval(render, 60000);
  }catch(err){
    el.cards.innerHTML = `<div class="empty">No se pudo cargar <strong>data.json</strong>. Revisa que el archivo exista y abre el proyecto con servidor local o desde GitHub Pages.</div>`;
    el.tableBody.innerHTML = `<tr><td colspan="10"><div class="empty">No se pudo cargar la data.</div></td></tr>`;
    console.error(err);
  }
}

loadData();

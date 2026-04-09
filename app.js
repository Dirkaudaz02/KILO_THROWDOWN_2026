const DATA_URL = "./data.json";
const THEME_KEY = "kilo-speedway-theme";

const state = {
  rows: [],
  event: "ALL",
  search: "",
  category: "ALL",
  box: "ALL",
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
  eventTabs: $("#eventTabs"),
  cards: $("#cards"),
  tableBody: $("#tableBody"),
  countSearch: $("#countSearch"),
  countResults: $("#countResults"),
  topBoxes: $("#topBoxes")
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
    if(state.event !== "ALL" && r.evento !== state.event) return false;
    if(state.category !== "ALL" && r.categoria !== state.category) return false;
    if(state.box !== "ALL" && r.box !== state.box) return false;
    if(!q) return true;

    const target = [
      r.atleta1, r.atleta2, r.equipo, r.box, r.evento, r.categoria
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

function renderCards(rows){
  if(!rows.length){
    el.cards.innerHTML = `<div class="empty">No se encontraron resultados con esos filtros.</div>`;
    return;
  }

  el.cards.innerHTML = rows.map(r => `
    <article class="card">
      <div class="card-top">
        <div class="badges">
          <span class="badge event">${r.evento || "-"}</span>
          <span class="badge heat">${r.heat || "-"}</span>
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
    <tr>
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

function renderTopBoxes(rows){
  const map = {};
  rows.forEach(r => {
    const b = String(r.box || "").trim();
    if(!b) return;
    map[b] = (map[b] || 0) + 1;
  });

  const top = Object.entries(map)
    .sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0,3);

  if(!top.length){
    el.topBoxes.innerHTML = `<div class="empty">No hay boxes visibles en el resultado actual.</div>`;
    return;
  }

  el.topBoxes.innerHTML = top.map(([name,count], idx) => `
    <div class="top-item">
      <div class="rank">${idx+1}</div>
      <div class="top-name">${name}</div>
      <div class="top-count">${count} atletas/equipos</div>
    </div>
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
  el.countSearch.textContent = `${rows.length} filas`;
  el.countResults.textContent = `${rows.length} visibles`;
  renderTabs();
  renderCards(rows);
  renderTable(rows);
  renderTopBoxes(rows);
  bindTabEvents();
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

  el.clearBtn.addEventListener("click", () => {
    state.event = "ALL";
    state.search = "";
    state.category = "ALL";
    state.box = "ALL";
    state.sort = "time";
    state.sortDir = "asc";

    el.searchInput.value = "";
    el.categorySelect.value = "ALL";
    el.boxSelect.value = "ALL";
    el.sortSelect.value = "time";

    render();
  });

  $$(".quick button").forEach(btn => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.quick || btn.textContent.trim();
      state.search = q;
      el.searchInput.value = q;
      render();
      window.scrollTo({
        top: el.searchInput.getBoundingClientRect().top + window.scrollY - 84,
        behavior: "smooth"
      });
    });
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

    initFilters();
    renderTabs();
    restoreTheme();
    bindEvents();
    render();
  }catch(err){
    el.cards.innerHTML = `<div class="empty">No se pudo cargar <strong>data.json</strong>. Revisa que el archivo exista y abre el proyecto con servidor local o desde GitHub Pages.</div>`;
    el.tableBody.innerHTML = `<tr><td colspan="10"><div class="empty">No se pudo cargar la data.</div></td></tr>`;
    console.error(err);
  }
}

loadData();

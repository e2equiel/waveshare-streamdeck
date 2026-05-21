const i18n = {
    en: {
        appTitle: "Stream Deck Configuration",
        headerTitle: "Stream Deck Controller",
        deviceTitle: "Device",
        pagesTitle: "Pages",
        newPagePlaceholder: "Page name...",
        settingsTitle: "Settings",
        brightnessLabel: "Brightness",
        btnSaveAll: "Deploy / Save All",
        btnSaving: "Saving...",
        propertiesTitle: "Properties",
        elementTitle: "Element",
        buttonTitle: (col, row) => `Button (Col ${col}, Row ${row})`,
        extraDisplayTitle: "Extra Display",
        actionLabel: "Action",
        actionNone: "None",
        actionOpenApp: "Open App",
        actionHotkey: "Hotkey",
        actionSwitchPage: "Switch Page",
        actionFolder: "Open Folder",
        actionBackButton: "Back Button",
        actionMedia: "Media Control",
        actionText: "Type Text",
        actionMulti: "Multi-Action (Macro)",
        actionWidget: "Custom Widget (Clock/Stats)",
        payloadLabel: "Payload",
        payloadApp: "Application",
        payloadHotkey: "Keys (e.g. command+c)",
        payloadPage: "Target Page",
        payloadFolder: "Folder Name",
        payloadMedia: "Media Command",
        payloadText: "Text to type",
        mediaPlayPause: "Play / Pause",
        mediaNext: "Next Track",
        mediaPrev: "Previous Track",
        mediaVolUp: "Volume Up",
        mediaVolDown: "Volume Down",
        mediaMute: "Mute",
        imageLabel: "Image",
        labelLabel: "Label (Text on icon)",
        labelPlaceholder: "e.g., Play, OBS...",
        btnChooseIcon: "Choose Icon",
        iconTitle: "Select an Icon",
        searchIconPlaceholder: "Search icons...",
        dragDropText: "Drag & Drop",
        emptyStateText: "Select an element on the canvas to edit its properties.",
        cropTitle: "Adjust Image",
        btnCancel: "Cancel",
        btnApply: "Apply",
        noDevices: "No devices found",
        macroSteps: "Macro Steps",
        btnAddMacroStep: "+ Add Action",
        actionDelay: "Delay (pause)",
        payloadDelay: "e.g. 1500 (for 1.5s)",
        smartProfilesTitle: "Smart Profiles",
        smartProfilesDesc: "Automatically switch to a specific page when a macOS application becomes active.",
        btnAddProfile: "+ Add Smart Profile",
        appPlaceholder: "App Name (e.g. Safari)"
    },
    es: {
        appTitle: "Configuración Stream Deck",
        headerTitle: "Controlador Stream Deck",
        deviceTitle: "Dispositivo",
        pagesTitle: "Páginas",
        newPagePlaceholder: "Nombre de página...",
        settingsTitle: "Ajustes",
        brightnessLabel: "Brillo",
        btnSaveAll: "Desplegar / Guardar todo",
        btnSaving: "Guardando...",
        propertiesTitle: "Propiedades",
        elementTitle: "Elemento",
        buttonTitle: (col, row) => `Botón (Col ${col}, Fila ${row})`,
        extraDisplayTitle: "Pantalla Extra",
        actionLabel: "Acción",
        actionNone: "Ninguna",
        actionOpenApp: "Abrir App",
        actionHotkey: "Atajo",
        actionSwitchPage: "Cambiar Página",
        actionFolder: "Abrir Carpeta",
        actionBackButton: "Botón Atrás",
        actionMedia: "Control Multimedia",
        actionText: "Escribir Texto",
        actionMulti: "Multi-Acción (Macro)",
        actionWidget: "Widget Custom (Reloj/Métricas)",
        payloadLabel: "Carga Útil",
        payloadApp: "Aplicación",
        payloadHotkey: "Teclas (ej. command+c)",
        payloadPage: "Página Destino",
        payloadFolder: "Nombre de Carpeta",
        payloadMedia: "Comando Multimedia",
        payloadText: "Texto a escribir",
        mediaPlayPause: "Reproducir / Pausa",
        mediaNext: "Siguiente Pista",
        mediaPrev: "Pista Anterior",
        mediaVolUp: "Subir Volumen",
        mediaVolDown: "Bajar Volumen",
        mediaMute: "Silenciar",
        imageLabel: "Imagen",
        labelLabel: "Etiqueta (Texto en ícono)",
        labelPlaceholder: "ej., Play, OBS...",
        btnChooseIcon: "Elegir Ícono",
        iconTitle: "Selecciona un Ícono",
        searchIconPlaceholder: "Buscar íconos...",
        dragDropText: "Arrastrar y Soltar",
        emptyStateText: "Selecciona un elemento en el lienzo para editar sus propiedades.",
        cropTitle: "Ajustar Imagen",
        btnCancel: "Cancelar",
        btnApply: "Aplicar",
        noDevices: "No se encontraron dispositivos",
        macroSteps: "Pasos de Macro",
        btnAddMacroStep: "+ Agregar Acción",
        actionDelay: "Retraso (pausa)",
        payloadDelay: "ej. 1500 (para 1.5s)",
        smartProfilesTitle: "Perfiles Inteligentes",
        smartProfilesDesc: "Cambia automáticamente a una página específica cuando una aplicación en macOS se vuelve activa.",
        btnAddProfile: "+ Agregar Perfil",
        appPlaceholder: "App (ej. Safari)"
    }
};

let currentLang = 'en';

let config = { pages: { main: {} }, settings: { brightness: 50 }, smart_profiles: {} };
let layout = { width: 896, height: 304, rects: [] };
let apps = [];
let currentPage = "main";
let activeRectKey = null;
let cropper = null;
let currentCropFile = null;
let currentDeviceId = "";

// DOM Elements
const deviceSelect = document.getElementById("device-select");
const pagesList = document.getElementById("pages-list");
const btnNewPage = document.getElementById("btn-new-page");
const newPageName = document.getElementById("new-page-name");
const deckPreview = document.getElementById("deck-preview");
const btnSaveAll = document.getElementById("btn-save-all");
const brightnessSlider = document.getElementById("brightness-slider");
const langSelect = document.getElementById("lang-select");

// Properties Panel
const propertiesPanel = document.getElementById("properties-panel");
const propertiesEmpty = document.getElementById("properties-empty");
const propTitle = document.getElementById("prop-title");
const propAction = document.getElementById("prop-action");
const propPayload = document.getElementById("prop-payload");
const propAppSelect = document.getElementById("prop-app-select");
const propPageSelect = document.getElementById("prop-page-select");
const propMediaSelect = document.getElementById("prop-media-select");
const propPayloadLabel = document.getElementById("prop-payload-label");
const propPayloadGroup = document.getElementById("prop-payload-group");
const propLabel = document.getElementById("prop-label");

const propMacroGroup = document.getElementById("prop-macro-group");
const macroStepsList = document.getElementById("macro-steps-list");
const btnAddMacroStep = document.getElementById("btn-add-macro-step");
let currentMacroSteps = [];

const propImageDropzone = document.getElementById("prop-image-dropzone");
const propImagePreview = document.getElementById("prop-image-preview");
const btnChooseIcon = document.getElementById("btn-choose-icon");

// Styling UI
const propIconColor = document.getElementById("prop-icon-color");
const propBgType = document.getElementById("prop-bg-type");
const propBgSolidGroup = document.getElementById("prop-bg-solid-group");
const propBgGradientGroup = document.getElementById("prop-bg-gradient-group");
const propBgColor = document.getElementById("prop-bg-color");
const propBgGrad1 = document.getElementById("prop-bg-grad1");
const propBgGrad2 = document.getElementById("prop-bg-grad2");
const btnClearImage = document.getElementById("btn-clear-image");
const btnClearAction = document.getElementById("btn-clear-action");

// Clipboard
let clipboardAction = null;
const btnCopyAction = document.getElementById("btn-copy-action");
const btnPasteAction = document.getElementById("btn-paste-action");
const btnDuplicateAction = document.getElementById("btn-duplicate-action");

const iconModal = document.getElementById("icon-modal");
const closeIconModal = document.getElementById("close-icon-modal");
const iconSearch = document.getElementById("icon-search");
const iconGrid = document.getElementById("icon-grid");

// Widget Editor UI
const widgetModal = document.getElementById("widget-modal");
const widgetCanvas = document.getElementById("widget-canvas");
const wElText = document.getElementById("w-el-text");
const wElColor = document.getElementById("w-el-color");
const wElSize = document.getElementById("w-el-size");
const wElDelete = document.getElementById("w-el-delete");
const btnSaveWidget = document.getElementById("btn-save-widget");
const btnCancelWidget = document.getElementById("btn-cancel-widget");
let currentWidgetElements = [];
let selectedWidgetElIndex = -1;

// Smart Profiles DOM
const smartProfilesList = document.getElementById("smart-profiles-list");
const btnAddProfile = document.getElementById("btn-add-profile");

function applyTranslations() {
    const t = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    // Convert 'clock' options to 'widget' options dynamically in the Action Select
    let widgetOpt = propAction.querySelector('option[value="widget"]');
    if (!widgetOpt) {
        // Migration: Remove old clock option if exists, add widget option
        const clockOpt = propAction.querySelector('option[value="clock"]');
        if (clockOpt) clockOpt.remove();
        widgetOpt = document.createElement('option');
        widgetOpt.value = 'widget';
        propAction.appendChild(widgetOpt);
    }
    widgetOpt.textContent = t.actionWidget;
    
    if (activeRectKey) updatePropertiesPanelTitle();
    updatePayloadVisibility();
    if (activeRectKey && propAction.value === 'multi_action') renderMacroSteps();
    renderSmartProfiles();
}

langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyTranslations();
});

async function init() {
    applyTranslations();
    await fetchDevices();
    await fetchApps();
    if (currentDeviceId) {
        await fetchLayout();
        await fetchConfig();
        renderPagesList();
        renderCanvas();
        renderSmartProfiles();
        renderWidgetLibrary();
    }
    setupEventListeners();
}

async function fetchDevices() {
    const res = await fetch('/api/devices');
    const devices = await res.json();
    deviceSelect.innerHTML = '';
    
    if (devices.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = i18n[currentLang].noDevices;
        opt.value = "";
        deviceSelect.appendChild(opt);
        return;
    }
    
    devices.forEach((d, index) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        let modelName = d.model && d.model !== "Unknown" ? d.model : `Stream Deck ${index + 1}`;
        opt.textContent = modelName;
        deviceSelect.appendChild(opt);
    });
    
    currentDeviceId = devices[0].id;
    deviceSelect.value = currentDeviceId;
}

async function fetchApps() {
    const res = await fetch('/api/apps');
    apps = await res.json();
    apps.forEach(app => {
        const opt = document.createElement('option');
        opt.value = app.path;
        opt.textContent = app.name;
        propAppSelect.appendChild(opt);
    });
}

async function fetchLayout() {
    const res = await fetch(`/api/layout?device_id=${encodeURIComponent(currentDeviceId)}`);
    layout = await res.json();
    deckPreview.style.width = layout.width + 'px';
    deckPreview.style.height = layout.height + 'px';
}

async function fetchConfig() {
    const res = await fetch(`/api/config?device_id=${encodeURIComponent(currentDeviceId)}`);
    config = await res.json();
    if (!config.pages) config.pages = { main: {} };
    if (!config.settings) config.settings = { brightness: 50 };
    if (!config.smart_profiles) config.smart_profiles = {};
    
    // Migrate old clock to widget
    for (const page in config.pages) {
        for (const key in config.pages[page]) {
            if (config.pages[page][key].type === 'clock') {
                config.pages[page][key].type = 'widget';
            }
        }
    }
    
    brightnessSlider.value = config.settings.brightness;
}

function renderSmartProfiles() {
    if (!smartProfilesList) return;
    if (!config.smart_profiles) config.smart_profiles = {};
    
    smartProfilesList.innerHTML = '';
    const t = i18n[currentLang];
    const profileKeys = Object.keys(config.smart_profiles);
    
    profileKeys.forEach(appName => {
        const targetPage = config.smart_profiles[appName];
        const div = document.createElement('div');
        div.className = 'macro-step';
        
        const remove = document.createElement('span');
        remove.className = 'remove-step';
        remove.innerHTML = '&times;';
        remove.onclick = () => {
            delete config.smart_profiles[appName];
            renderSmartProfiles();
        };
        div.appendChild(remove);
        
        const appSelect = document.createElement('select');
        let found = false;
        apps.forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.name;
            opt.textContent = app.name;
            if (app.name === appName) found = true;
            appSelect.appendChild(opt);
        });
        if (!found && appName) {
            const opt = document.createElement('option');
            opt.value = appName;
            opt.textContent = appName + " (Custom)";
            appSelect.appendChild(opt);
        }
        appSelect.value = appName;
        appSelect.onchange = (e) => {
            const newName = e.target.value.trim();
            if (newName && newName !== appName) {
                config.smart_profiles[newName] = config.smart_profiles[appName];
                delete config.smart_profiles[appName];
                renderSmartProfiles();
            }
        };
        div.appendChild(appSelect);
        
        const pageSelect = document.createElement('select');
        for (const pageName in config.pages) {
            const opt = document.createElement('option');
            opt.value = pageName;
            opt.textContent = pageName;
            pageSelect.appendChild(opt);
        }
        pageSelect.value = targetPage;
        pageSelect.onchange = (e) => {
            config.smart_profiles[appName] = e.target.value;
        };
        div.appendChild(pageSelect);
        
        smartProfilesList.appendChild(div);
    });
}

function renderPagesList() {
    pagesList.innerHTML = '';
    propPageSelect.innerHTML = '';
    
    for (const pageName in config.pages) {
        const li = document.createElement('li');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = pageName;
        li.appendChild(nameSpan);
        
        if (pageName !== 'main') {
            const delBtn = document.createElement('span');
            delBtn.innerHTML = '&times;';
            delBtn.style.color = '#ef4444';
            delBtn.style.padding = '0 5px';
            delBtn.style.borderRadius = '4px';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete page "${pageName}"?`)) {
                    delete config.pages[pageName];
                    if (currentPage === pageName) currentPage = 'main';
                    activeRectKey = null;
                    renderPagesList();
                    renderCanvas();
                    updatePropertiesPanel();
                    renderSmartProfiles();
                }
            };
            li.appendChild(delBtn);
        }

        if (pageName === currentPage) li.classList.add('active');
        li.onclick = () => {
            currentPage = pageName;
            activeRectKey = null;
            renderPagesList();
            renderCanvas();
            updatePropertiesPanel();
        };
        pagesList.appendChild(li);
        
        const opt = document.createElement('option');
        opt.value = pageName;
        opt.textContent = pageName;
        propPageSelect.appendChild(opt);
    }
}

// Drag and Drop Button Grid Variables
let dragSourceKey = null;

let previewDebounceTimers = {};
function requestTruePreview(el, actionData, width, height) {
    if (previewDebounceTimers[el.id]) clearTimeout(previewDebounceTimers[el.id]);
    previewDebounceTimers[el.id] = setTimeout(async () => {
        try {
            const res = await fetch('/api/preview_button', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: actionData, width, height })
            });
            const data = await res.json();
            if (data.image) {
                el.style.backgroundImage = `url('${data.image}')`;
                el.style.backgroundSize = 'contain';
                el.style.backgroundPosition = 'center';
                el.style.backgroundRepeat = 'no-repeat';
                el.style.backgroundColor = 'transparent';
            }
        } catch(e) {}
    }, 150);
}

function renderCanvas() {
    deckPreview.innerHTML = '';
    const pageData = config.pages[currentPage] || {};
    
    layout.rects.forEach((rect, index) => {
        const isKey = rect.isKey;
        const keyID = isKey ? `${rect.col}_${rect.row}` : `extra_${index}`;
        const actionData = pageData[keyID];
        
        const el = document.createElement('div');
        el.className = 'deck-rect';
        el.id = 'rect-' + keyID;
        if (keyID === activeRectKey) el.classList.add('active');
        
        el.style.left = `${(rect.x / layout.width) * 100}%`;
        el.style.top = `${(rect.y / layout.height) * 100}%`;
        el.style.width = `${(rect.width / layout.width) * 100}%`;
        el.style.height = `${(rect.height / layout.height) * 100}%`;

        if (actionData && (actionData.type || actionData.image)) {
            // True Fidelity Preview via backend
            requestTruePreview(el, actionData, rect.width, rect.height);
        } else {
            el.style.backgroundColor = 'transparent';
            el.style.backgroundImage = 'none';
        }

        
        // Drag and Drop Logic
        if (isKey) {
            el.draggable = true;
            el.ondragstart = (e) => {
                dragSourceKey = keyID;
                e.dataTransfer.effectAllowed = "move";
                el.style.opacity = '0.5';
            };
            el.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            };
            el.ondrop = (e) => {
                e.preventDefault();
                el.style.opacity = '1';
                if (dragSourceKey && dragSourceKey !== keyID) {
                    // Swap logic
                    const temp = config.pages[currentPage][keyID];
                    config.pages[currentPage][keyID] = config.pages[currentPage][dragSourceKey];
                    if (temp) {
                        config.pages[currentPage][dragSourceKey] = temp;
                    } else {
                        delete config.pages[currentPage][dragSourceKey];
                    }
                    if (activeRectKey === dragSourceKey) activeRectKey = keyID;
                    else if (activeRectKey === keyID) activeRectKey = dragSourceKey;
                    dragSourceKey = null;
                    renderCanvas();
                    updatePropertiesPanel();
                }
            };
            el.ondragend = () => { el.style.opacity = '1'; };
        }
        
        el.onclick = () => {
            activeRectKey = keyID;
            renderCanvas();
            updatePropertiesPanel(rect, keyID, actionData);
        };
        
        deckPreview.appendChild(el);
    });
}

function updatePropertiesPanelTitle(rect) {
    if (!activeRectKey) return;
    const t = i18n[currentLang];
    let currentRect = rect;
    if (!currentRect) {
        if (activeRectKey.startsWith('extra_')) {
            const idx = parseInt(activeRectKey.split('_')[1]);
            currentRect = layout.rects[idx];
        } else {
            const [c, r] = activeRectKey.split('_');
            currentRect = layout.rects.find(rt => rt.col == c && rt.row == r);
        }
    }
    
    if (currentRect && currentRect.isKey) {
        propTitle.textContent = t.buttonTitle(currentRect.col, currentRect.row);
    } else {
        propTitle.textContent = t.extraDisplayTitle;
    }
}

function updatePropertiesPanel(rect = null, keyID = null, actionData = null) {
    if (!keyID) {
        propertiesPanel.style.display = 'none';
        propertiesEmpty.style.display = 'flex';
        return;
    }
    
    propertiesPanel.style.display = 'block';
    propertiesEmpty.style.display = 'none';
    
    updatePropertiesPanelTitle(rect);
    
    propAction.value = actionData ? actionData.type || "" : "";
    propPayload.value = actionData ? (typeof actionData.payload === 'string' ? actionData.payload : "") : "";
    propAppSelect.value = actionData ? (typeof actionData.payload === 'string' ? actionData.payload : "") : "";
    propPageSelect.value = actionData ? (typeof actionData.payload === 'string' ? actionData.payload : "") : "";
    propMediaSelect.value = actionData ? (typeof actionData.payload === 'string' ? actionData.payload : "playpause") : "playpause";
    propLabel.value = actionData ? actionData.label || "" : "";
    propIconColor.value = actionData && actionData.icon_color ? actionData.icon_color : "#ffffff";
    
    // Background properties
    if (actionData && actionData.background) {
        propBgType.value = actionData.background.type;
        if (actionData.background.type === 'solid') {
            propBgColor.value = actionData.background.color || "#0f172a";
            propBgSolidGroup.style.display = 'block';
            propBgGradientGroup.style.display = 'none';
        } else {
            propBgGrad1.value = actionData.background.color1 || "#0f172a";
            propBgGrad2.value = actionData.background.color2 || "#1e293b";
            propBgSolidGroup.style.display = 'none';
            propBgGradientGroup.style.display = 'flex';
        }
    } else {
        propBgType.value = 'solid';
        propBgColor.value = '#0f172a';
        propBgSolidGroup.style.display = 'block';
        propBgGradientGroup.style.display = 'none';
    }
    
    if (actionData && actionData.type === 'multi_action') {
        renderMacroSteps(actionData.payload);
    } else {
        renderMacroSteps([]);
    }
    
    if (actionData && actionData.image && actionData.type !== 'widget') {
        const sep = actionData.image.includes('?') ? '&' : '?';
        propImagePreview.src = `${actionData.image}${sep}t=${Date.now()}`;
        propImagePreview.style.display = 'block';
    } else {
        propImagePreview.src = '';
        propImagePreview.style.display = 'none';
    }
    
    updatePayloadVisibility();
}

function updatePayloadVisibility() {
    const action = propAction.value;
    const t = i18n[currentLang];
    
    propPayload.style.display = 'none';
    propAppSelect.style.display = 'none';
    propPageSelect.style.display = 'none';
    propMediaSelect.style.display = 'none';
    propPayloadGroup.style.display = 'block';
    propMacroGroup.style.display = 'none';
    
    const wBtn = document.getElementById('btn-open-widget-editor');
    if (wBtn) wBtn.remove();
    
    if (action === 'multi_action') {
        propPayloadGroup.style.display = 'none';
        propMacroGroup.style.display = 'block';
    } else if (action === 'open_app') {
        propPayloadLabel.textContent = t.payloadApp;
        propAppSelect.style.display = 'block';
    } else if (action === 'hotkey') {
        propPayloadLabel.textContent = t.payloadHotkey;
        propPayload.style.display = 'block';
    } else if (action === 'switch_page') {
        propPayloadLabel.textContent = t.payloadPage;
        propPageSelect.style.display = 'block';
    } else if (action === 'folder') {
        propPayloadLabel.textContent = t.payloadFolder;
        propPayload.style.display = 'block';
    } else if (action === 'media') {
        propPayloadLabel.textContent = t.payloadMedia;
        propMediaSelect.style.display = 'block';
    } else if (action === 'text') {
        propPayloadLabel.textContent = t.payloadText;
        propPayload.style.display = 'block';
    } else if (action === 'widget') {
        propPayloadGroup.style.display = 'block';
        propPayloadLabel.textContent = "Widget Builder";
        const btn = document.createElement('button');
        btn.id = 'btn-open-widget-editor';
        btn.className = 'btn primary';
        btn.style.width = '100%';
        btn.textContent = "Open Editor";
        btn.onclick = openWidgetEditor;
        propPayloadGroup.appendChild(btn);
    } else {
        propPayloadGroup.style.display = 'none';
    }
}

function renderMacroSteps(steps = null) {
    if (steps !== null) currentMacroSteps = Array.isArray(steps) ? [...steps] : [];
    
    macroStepsList.innerHTML = '';
    const t = i18n[currentLang];
    
    currentMacroSteps.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = 'macro-step';
        
        const remove = document.createElement('span');
        remove.className = 'remove-step';
        remove.innerHTML = '&times;';
        remove.onclick = () => {
            currentMacroSteps.splice(index, 1);
            saveActiveRectState();
            renderMacroSteps();
        };
        div.appendChild(remove);
        
        const select = document.createElement('select');
        select.innerHTML = `
            <option value="open_app"${step.type==='open_app'?' selected':''}>${t.actionOpenApp}</option>
            <option value="hotkey"${step.type==='hotkey'?' selected':''}>${t.actionHotkey}</option>
            <option value="media"${step.type==='media'?' selected':''}>${t.actionMedia}</option>
            <option value="text"${step.type==='text'?' selected':''}>${t.actionText}</option>
            <option value="delay"${step.type==='delay'?' selected':''}>${t.actionDelay}</option>
        `;
        select.onchange = (e) => {
            step.type = e.target.value;
            step.payload = "";
            saveActiveRectState();
            renderMacroSteps();
        };
        div.appendChild(select);
        
        if (step.type === 'open_app') {
            const appSelect = document.createElement('select');
            appSelect.innerHTML = propAppSelect.innerHTML;
            appSelect.value = step.payload;
            appSelect.onchange = (e) => { step.payload = e.target.value; saveActiveRectState(); };
            div.appendChild(appSelect);
        } else if (step.type === 'media') {
            const mediaSelect = document.createElement('select');
            mediaSelect.innerHTML = propMediaSelect.innerHTML;
            mediaSelect.value = step.payload || 'playpause';
            mediaSelect.onchange = (e) => { step.payload = e.target.value; saveActiveRectState(); };
            div.appendChild(mediaSelect);
            if(!step.payload) step.payload = 'playpause';
        } else {
            const inp = document.createElement('input');
            inp.type = step.type === 'delay' ? 'number' : 'text';
            inp.placeholder = step.type === 'delay' ? t.payloadDelay : '...';
            inp.value = step.payload;
            inp.onchange = (e) => { step.payload = e.target.value; saveActiveRectState(); };
            div.appendChild(inp);
        }
        
        macroStepsList.appendChild(div);
    });
}

// Visual Widget Editor Logic
const wElAlign = document.getElementById("w-el-align");
const wElFont = document.getElementById("w-el-font");

function openWidgetEditor() {
    widgetModal.style.display = 'block';
    
    let rect;
    if (activeRectKey.startsWith('extra_')) {
        const idx = parseInt(activeRectKey.split('_')[1]);
        rect = layout.rects[idx];
    } else {
        const [c, r] = activeRectKey.split('_');
        rect = layout.rects.find(rt => rt.col == c && rt.row == r);
    }
    
    const ratio = rect.width / rect.height;
    const maxW = 540;
    const maxH = 400;
    
    let canvasW = maxW;
    let canvasH = maxW / ratio;
    if (canvasH > maxH) {
        canvasH = maxH;
        canvasW = maxH * ratio;
    }
    
    widgetCanvas.style.width = canvasW + 'px';
    widgetCanvas.style.height = canvasH + 'px';
    // True Preview will override the background image
    widgetCanvas.style.backgroundSize = 'contain';
    widgetCanvas.style.backgroundPosition = 'center';
    widgetCanvas.style.backgroundRepeat = 'no-repeat';
    
    let payload = {};
    if (config.pages[currentPage] && config.pages[currentPage][activeRectKey]) {
        payload = config.pages[currentPage][activeRectKey].payload || {};
    }
    currentWidgetElements = payload.elements || [];
    selectedWidgetElIndex = -1;
    renderWidgetCanvas();
}

let widgetPreviewTimer = null;
function requestWidgetLivePreview() {
    if (widgetPreviewTimer) clearTimeout(widgetPreviewTimer);
    widgetPreviewTimer = setTimeout(async () => {
        let bg = { type: 'solid', color: propBgColor.value };
        if (propBgType.value === 'gradient') {
            bg = { type: 'gradient', color1: propBgGrad1.value, color2: propBgGrad2.value };
        }
        const actionData = {
            type: 'widget',
            background: bg,
            payload: { elements: currentWidgetElements }
        };
        
        let rect;
        if (activeRectKey.startsWith('extra_')) {
            const idx = parseInt(activeRectKey.split('_')[1]);
            rect = layout.rects[idx];
        } else {
            const [c, r] = activeRectKey.split('_');
            rect = layout.rects.find(rt => rt.col == c && rt.row == r);
        }
        
        try {
            const res = await fetch('/api/preview_button', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: actionData, width: rect.width, height: rect.height })
            });
            const data = await res.json();
            if (data.image) {
                widgetCanvas.style.backgroundImage = `url('${data.image}')`;
            }
        } catch(e) {}
    }, 100);
}

function renderWidgetCanvas() {
    widgetCanvas.innerHTML = '';
    const cw = widgetCanvas.offsetWidth;
    const ch = widgetCanvas.offsetHeight;
    
    requestWidgetLivePreview();
    
    currentWidgetElements.forEach((el, index) => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = el.x + '%';
        div.style.top = el.y + '%';
        // Responsive drag handles with alignment support
        const fSizePx = (el.fontSize || 40) * (ch / 100);
        div.style.height = Math.max(20, fSizePx) + 'px';
        const estWidth = (el.content ? el.content.length : 4) * (fSizePx * 0.6);
        div.style.width = Math.max(30, estWidth) + 'px';
        
        div.style.borderRadius = '4px';
        
        if (el.align === 'left') {
            div.style.transform = 'translate(0%, -50%)';
        } else if (el.align === 'right') {
            div.style.transform = 'translate(-100%, -50%)';
        } else {
            div.style.transform = 'translate(-50%, -50%)';
        }
        
        if (index === selectedWidgetElIndex) {
            div.style.outline = '2px solid #3b82f6';
            div.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        } else {
            div.style.outline = '1px dashed rgba(255,255,255,0.3)';
            div.style.backgroundColor = 'transparent';
        }

        
        div.onmousedown = (e) => {
            selectedWidgetElIndex = index;
            
            Array.from(widgetCanvas.children).forEach((child, i) => {
                if (i === index) {
                    child.style.outline = '2px solid #3b82f6';
                    child.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                } else {
                    child.style.outline = '1px dashed rgba(255,255,255,0.3)';
                    child.style.backgroundColor = 'transparent';
                }
            });
            
            updateWidgetTools();
            
            let startX = e.clientX;
            let startY = e.clientY;
            let startElX = el.x;
            let startElY = el.y;
            
            const onMove = (ev) => {
                const dx = ((ev.clientX - startX) / cw) * 100;
                const dy = ((ev.clientY - startY) / ch) * 100;
                el.x = Math.max(0, Math.min(100, startElX + dx));
                el.y = Math.max(0, Math.min(100, startElY + dy));
                div.style.left = el.x + '%';
                div.style.top = el.y + '%';
                requestWidgetLivePreview();
            };
            
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };
        
        widgetCanvas.appendChild(div);
    });
    updateWidgetTools();
}

const wElStroke = document.getElementById('w-el-stroke');
const wElStrokeColor = document.getElementById('w-el-stroke-color');
const wElShadowX = document.getElementById('w-el-shadow-x');
const wElShadowY = document.getElementById('w-el-shadow-y');
const wElShadowColor = document.getElementById('w-el-shadow-color');

function updateWidgetTools() {
    if (selectedWidgetElIndex >= 0 && selectedWidgetElIndex < currentWidgetElements.length) {
        const el = currentWidgetElements[selectedWidgetElIndex];
        wElText.value = el.content || '';
        wElColor.value = el.color || '#ffffff';
        wElSize.value = el.fontSize || 40;
        wElAlign.value = el.align || 'center';
        wElFont.value = el.fontFamily || 'Outfit';
        
        wElStroke.value = el.strokeWidth || '';
        wElStrokeColor.value = el.strokeColor || '#000000';
        wElShadowX.value = el.shadowX || '';
        wElShadowY.value = el.shadowY || '';
        wElShadowColor.value = el.shadowColor || '#000000';
        
        wElText.disabled = el.type !== 'text';
        wElColor.disabled = false;
        wElSize.disabled = false;
        wElAlign.disabled = el.type !== 'text';
        wElFont.disabled = el.type !== 'text';
        wElStroke.disabled = el.type !== 'text' && el.type !== 'cpu_gauge' && el.type !== 'ram_gauge';
        wElStrokeColor.disabled = el.type !== 'text';
        wElShadowX.disabled = el.type !== 'text';
        wElShadowY.disabled = el.type !== 'text';
        wElShadowColor.disabled = el.type !== 'text';
        wElDelete.disabled = false;
    } else {
        wElText.value = '';
        wElColor.value = '#ffffff';
        wElSize.value = '';
        wElStroke.value = '';
        wElShadowX.value = '';
        wElShadowY.value = '';
        
        wElText.disabled = true;
        wElColor.disabled = true;
        wElSize.disabled = true;
        wElAlign.disabled = true;
        wElFont.disabled = true;
        wElStroke.disabled = true;
        wElStrokeColor.disabled = true;
        wElShadowX.disabled = true;
        wElShadowY.disabled = true;
        wElShadowColor.disabled = true;
        wElDelete.disabled = true;
    }
}

wElStroke.oninput = () => { if (selectedWidgetElIndex >= 0) { currentWidgetElements[selectedWidgetElIndex].strokeWidth = parseInt(wElStroke.value) || 0; requestWidgetLivePreview(); } };
wElStrokeColor.oninput = () => { if (selectedWidgetElIndex >= 0) { currentWidgetElements[selectedWidgetElIndex].strokeColor = wElStrokeColor.value; requestWidgetLivePreview(); } };
wElShadowX.oninput = () => { if (selectedWidgetElIndex >= 0) { currentWidgetElements[selectedWidgetElIndex].shadowX = parseInt(wElShadowX.value) || 0; requestWidgetLivePreview(); } };
wElShadowY.oninput = () => { if (selectedWidgetElIndex >= 0) { currentWidgetElements[selectedWidgetElIndex].shadowY = parseInt(wElShadowY.value) || 0; requestWidgetLivePreview(); } };
wElShadowColor.oninput = () => { if (selectedWidgetElIndex >= 0) { currentWidgetElements[selectedWidgetElIndex].shadowColor = wElShadowColor.value; requestWidgetLivePreview(); } };

document.getElementById('w-add-time').onclick = () => {
    currentWidgetElements.push({type: 'text', content: '{time}', x: 50, y: 50, fontSize: 40, color: '#f8fafc', align: 'center', fontFamily: 'Outfit'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-date').onclick = () => {
    currentWidgetElements.push({type: 'text', content: '{date}', x: 50, y: 50, fontSize: 15, color: '#94a3b8', align: 'center', fontFamily: 'Outfit'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-cpu').onclick = () => {
    currentWidgetElements.push({type: 'text', content: 'CPU: {cpu}%', x: 50, y: 50, fontSize: 15, color: '#ef4444', align: 'center', fontFamily: 'Outfit'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-ram').onclick = () => {
    currentWidgetElements.push({type: 'text', content: 'RAM: {ram}%', x: 50, y: 50, fontSize: 15, color: '#3b82f6', align: 'center', fontFamily: 'Outfit'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-text').onclick = () => {
    currentWidgetElements.push({type: 'text', content: 'Text', x: 50, y: 50, fontSize: 30, color: '#ffffff', align: 'center', fontFamily: 'Outfit'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-analog').onclick = () => {
    currentWidgetElements.push({type: 'analog_clock', x: 50, y: 50, fontSize: 35, color: '#ffffff'});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-cpu-gauge').onclick = () => {
    currentWidgetElements.push({type: 'cpu_gauge', x: 50, y: 50, fontSize: 30, color: '#ef4444', strokeWidth: 8});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};
document.getElementById('w-add-ram-gauge').onclick = () => {
    currentWidgetElements.push({type: 'ram_gauge', x: 50, y: 50, fontSize: 30, color: '#10b981', strokeWidth: 8});
    selectedWidgetElIndex = currentWidgetElements.length - 1;
    renderWidgetCanvas();
};

wElText.oninput = (e) => {
    if (selectedWidgetElIndex >= 0) {
        currentWidgetElements[selectedWidgetElIndex].content = e.target.value;
        requestWidgetLivePreview();
    }
};
wElColor.oninput = (e) => {
    if (selectedWidgetElIndex >= 0) {
        currentWidgetElements[selectedWidgetElIndex].color = e.target.value;
        requestWidgetLivePreview();
    }
};
wElSize.oninput = (e) => {
    if (selectedWidgetElIndex >= 0) {
        currentWidgetElements[selectedWidgetElIndex].fontSize = parseInt(e.target.value) || 20;
        requestWidgetLivePreview();
    }
};
wElAlign.onchange = (e) => {
    if (selectedWidgetElIndex >= 0) {
        currentWidgetElements[selectedWidgetElIndex].align = e.target.value;
        requestWidgetLivePreview();
    }
};
wElFont.onchange = (e) => {
    if (selectedWidgetElIndex >= 0) {
        currentWidgetElements[selectedWidgetElIndex].fontFamily = e.target.value;
        requestWidgetLivePreview();
    }
};
// Custom Color Picker Logic
let savedColors = JSON.parse(localStorage.getItem('savedColors') || '["#0f172a", "#1e293b", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff", "#000000"]');
const cpPopup = document.getElementById('custom-color-picker');
const cpSwatches = document.getElementById('cp-swatches');
const cpNative = document.getElementById('cp-native');
const cpAdd = document.getElementById('cp-add');

let activeColorInput = null;

function renderSwatches() {
    cpSwatches.innerHTML = '';
    savedColors.forEach((color, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'cp-swatch';
        swatch.style.backgroundColor = color;
        swatch.onclick = () => {
            if (activeColorInput) {
                activeColorInput.value = color;
                activeColorInput.dispatchEvent(new Event('input'));
                activeColorInput.dispatchEvent(new Event('change'));
            }
            cpPopup.style.display = 'none';
        };
        cpSwatches.appendChild(swatch);
    });
}

function attachCustomColorPicker() {
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        if (input.id === 'cp-native') return;
        input.addEventListener('click', (e) => {
            e.preventDefault();
            activeColorInput = input;
            renderSwatches();
            const rect = input.getBoundingClientRect();
            cpPopup.style.display = 'block';
            
            // Adjust position
            let top = rect.bottom + window.scrollY + 5;
            let left = rect.left + window.scrollX;
            if (left + 220 > window.innerWidth) left = window.innerWidth - 230;
            
            cpPopup.style.top = top + 'px';
            cpPopup.style.left = left + 'px';
        });
    });
}

cpAdd.onclick = () => {
    cpNative.click();
};

cpNative.onchange = (e) => {
    const newColor = e.target.value;
    if (!savedColors.includes(newColor)) {
        savedColors.unshift(newColor);
        if (savedColors.length > 20) savedColors.pop();
        localStorage.setItem('savedColors', JSON.stringify(savedColors));
    }
    if (activeColorInput) {
        activeColorInput.value = newColor;
        activeColorInput.dispatchEvent(new Event('input'));
        activeColorInput.dispatchEvent(new Event('change'));
    }
    renderSwatches();
};

document.addEventListener('click', (e) => {
    if (cpPopup.style.display === 'block' && !cpPopup.contains(e.target) && e.target !== activeColorInput) {
        cpPopup.style.display = 'none';
    }
});

attachCustomColorPicker();


btnSaveWidget.onclick = () => {
    widgetModal.style.display = 'none';
    
    // Construct background payload
    let bg = { type: 'solid', color: propBgColor.value };
    if (propBgType.value === 'gradient') {
        bg = { type: 'gradient', color1: propBgGrad1.value, color2: propBgGrad2.value };
    }
    
    if (!config.pages[currentPage]) config.pages[currentPage] = {};
    if (!config.pages[currentPage][activeRectKey]) config.pages[currentPage][activeRectKey] = {};
    
    config.pages[currentPage][activeRectKey].payload = {
        background: bg,
        elements: JSON.parse(JSON.stringify(currentWidgetElements))
    };
    saveActiveRectState();
    saveConfig();
};
btnCancelWidget.onclick = () => {
    widgetModal.style.display = 'none';
};

// End Widget Editor

async function generateIconImage(iconName, labelText, iconColor) {
    if (!iconName) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Transparente para que se vea el color/gradiente dibujado en el backend
    ctx.clearRect(0, 0, 256, 256);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `<i data-lucide="${iconName}"></i>`;
    lucide.createIcons({ root: tempDiv });
    const svgNode = tempDiv.querySelector('svg');
    
    if (svgNode) {
        svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgNode.setAttribute('width', '128');
        svgNode.setAttribute('height', '128');
        svgNode.setAttribute('stroke', iconColor || '#ffffff');
        
        const svgString = svgNode.outerHTML;
        const blob = new Blob([svgString], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const yOffset = labelText ? -16 : 0;
                ctx.drawImage(img, 64, 64 + yOffset, 128, 128);
                URL.revokeObjectURL(url);
                resolve();
            };
            img.src = url;
        });
    }
    
    if (labelText) {
        ctx.fillStyle = iconColor || '#ffffff';
        ctx.font = '500 28px "Outfit", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, 128, 220);
    }
    
    const base64Image = canvas.toDataURL('image/png');
    const res = await fetch('/api/upload_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64Image })
    });
    const data = await res.json();
    return data.path;
}

function populateIconGrid(query = '') {
    iconGrid.innerHTML = '';
    const q = query.toLowerCase();
    const iconNames = Object.keys(lucide.icons);
    
    let count = 0;
    for (const name of iconNames) {
        const kebabName = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        
        if (!q || kebabName.includes(q)) {
            const div = document.createElement('div');
            div.className = 'icon-item';
            div.innerHTML = `<i data-lucide="${kebabName}"></i>`;
            div.title = kebabName;
            div.onclick = async () => {
                iconModal.style.display = 'none';
                if (activeRectKey) {
                    const path = await generateIconImage(kebabName, propLabel.value, propIconColor.value);
                    if (!config.pages[currentPage]) config.pages[currentPage] = {};
                    if (!config.pages[currentPage][activeRectKey]) config.pages[currentPage][activeRectKey] = {};
                    
                    config.pages[currentPage][activeRectKey].image = path;
                    config.pages[currentPage][activeRectKey].lucide_icon = kebabName;
                    
                    propImagePreview.src = path;
                    propImagePreview.style.display = 'block';
                    saveActiveRectState();
                }
            };
            iconGrid.appendChild(div);
            count++;
            if (count > 250) break;
        }
    }
    lucide.createIcons({ root: iconGrid });
}

async function saveActiveRectState() {
    if (!activeRectKey) return;
    
    if (!config.pages[currentPage]) config.pages[currentPage] = {};
    const pageData = config.pages[currentPage];
    if (!pageData[activeRectKey]) pageData[activeRectKey] = {};
    
    const action = propAction.value;
    pageData[activeRectKey].type = action;
    
    if (action === 'open_app') pageData[activeRectKey].payload = propAppSelect.value;
    else if (action === 'hotkey') pageData[activeRectKey].payload = propPayload.value;
    else if (action === 'switch_page') pageData[activeRectKey].payload = propPageSelect.value;
    else if (action === 'media') pageData[activeRectKey].payload = propMediaSelect.value;
    else if (action === 'text') pageData[activeRectKey].payload = propPayload.value;
    else if (action === 'multi_action') pageData[activeRectKey].payload = currentMacroSteps;
    else if (action === 'folder') {
        const targetPage = propPayload.value.trim();
        if (targetPage) {
            pageData[activeRectKey].payload = targetPage;
            if (!config.pages[targetPage]) {
                config.pages[targetPage] = {}; // Auto-create folder page
                renderPagesList();
                renderSmartProfiles();
            }
        }
    }
    
    // Save Background Config
    pageData[activeRectKey].background = {
        type: propBgType.value,
        color: propBgColor.value,
        color1: propBgGrad1.value,
        color2: propBgGrad2.value
    };
    
    pageData[activeRectKey].icon_color = propIconColor.value;
    
    // Auto-Icons & Labels logic
    const prevImage = pageData[activeRectKey].image;
    let targetIcon = pageData[activeRectKey].lucide_icon;
    let needsGen = false;
    
    if (action === 'folder' && !prevImage) {
        targetIcon = 'folder';
        needsGen = true;
    } else if (action === 'back_button' && !prevImage) {
        targetIcon = 'corner-up-left';
        needsGen = true;
    } else if (action === 'text' && !prevImage) {
        targetIcon = 'type';
        needsGen = true;
    } else if (action === 'multi_action' && !prevImage) {
        targetIcon = 'layers';
        needsGen = true;
    } else if (action === 'media' && !prevImage) {
        const m = propMediaSelect.value;
        if (m === 'playpause') targetIcon = 'play';
        else if (m === 'nexttrack') targetIcon = 'skip-forward';
        else if (m === 'prevtrack') targetIcon = 'skip-back';
        else if (m === 'volumeup') targetIcon = 'volume-2';
        else if (m === 'volumedown') targetIcon = 'volume-1';
        else if (m === 'volumemute') targetIcon = 'volume-x';
        needsGen = true;
    } else if (targetIcon && (pageData[activeRectKey].label !== propLabel.value || pageData[activeRectKey].last_color !== propIconColor.value)) {
        needsGen = true;
    }
    
    pageData[activeRectKey].label = propLabel.value;
    pageData[activeRectKey].last_color = propIconColor.value;
    
    if (needsGen && targetIcon) {
        const path = await generateIconImage(targetIcon, propLabel.value, propIconColor.value);
        pageData[activeRectKey].image = path;
        pageData[activeRectKey].lucide_icon = targetIcon;
        propImagePreview.src = path;
        propImagePreview.style.display = 'block';
    }
    
    if (action === 'open_app' && propAppSelect.value && !pageData[activeRectKey].lucide_icon) {
        try {
            const res = await fetch(`/api/extract_app_icon?app_path=${encodeURIComponent(propAppSelect.value)}`);
            if (res.ok) {
                const data = await res.json();
                pageData[activeRectKey].image = data.path;
                const sep = data.path.includes('?') ? '&' : '?';
                propImagePreview.src = `${data.path}${sep}t=${Date.now()}`;
                propImagePreview.style.display = 'block';
            }
        } catch (e) {
            console.error("Failed to extract icon", e);
        }
    }
    
    renderCanvas();
}

function setupEventListeners() {
    propAction.addEventListener('change', () => {
        updatePayloadVisibility();
        saveActiveRectState();
    });

    propPayload.addEventListener('change', saveActiveRectState);
    propLabel.addEventListener('change', saveActiveRectState);
    propAppSelect.addEventListener('change', saveActiveRectState);
    propPageSelect.addEventListener('change', saveActiveRectState);
    propMediaSelect.addEventListener('change', saveActiveRectState);
    
    // Background and Color styling
    propIconColor.addEventListener('change', saveActiveRectState);
    propBgColor.addEventListener('change', saveActiveRectState);
    propBgGrad1.addEventListener('change', saveActiveRectState);
    propBgGrad2.addEventListener('change', saveActiveRectState);
    
    propBgType.addEventListener('change', () => {
        if (propBgType.value === 'solid') {
            propBgSolidGroup.style.display = 'block';
            propBgGradientGroup.style.display = 'none';
        } else {
            propBgSolidGroup.style.display = 'none';
            propBgGradientGroup.style.display = 'flex';
        }
        saveActiveRectState();
    });
    
    btnClearImage.addEventListener('click', () => {
        if (!activeRectKey || !config.pages[currentPage] || !config.pages[currentPage][activeRectKey]) return;
        delete config.pages[currentPage][activeRectKey].image;
        delete config.pages[currentPage][activeRectKey].lucide_icon;
        updatePropertiesPanel(); // refresh
        saveActiveRectState();
    });
    
    btnClearAction.onclick = () => {
        if (activeRectKey) {
            config.pages[currentPage][activeRectKey] = {};
            updatePropertiesPanel();
            renderCanvas();
            saveConfig();
        }
    };
    
    btnCopyAction.onclick = () => {
        if (activeRectKey) {
            const pageActions = config.pages[currentPage] || {};
            clipboardAction = JSON.parse(JSON.stringify(pageActions[activeRectKey] || {}));
            btnPasteAction.disabled = false;
            lucide.createIcons();
        }
    };
    
    btnPasteAction.onclick = () => {
        if (activeRectKey && clipboardAction) {
            if (!config.pages[currentPage]) config.pages[currentPage] = {};
            config.pages[currentPage][activeRectKey] = JSON.parse(JSON.stringify(clipboardAction));
            updatePropertiesPanel();
            renderCanvas();
            saveConfig();
        }
    };
    
    btnDuplicateAction.onclick = () => {
        if (activeRectKey) {
            const pageActions = config.pages[currentPage] || {};
            let emptyKey = null;
            for (let r of layout.rects) {
                let k = `${r.col}_${r.row}`;
                if (!pageActions[k] || !pageActions[k].type) {
                    emptyKey = k;
                    break;
                }
            }
            if (emptyKey) {
                config.pages[currentPage][emptyKey] = JSON.parse(JSON.stringify(pageActions[activeRectKey] || {}));
                renderCanvas();
                saveConfig();
            } else {
                alert("No empty space on this page!");
            }
        }
    };

    btnAddMacroStep.addEventListener('click', () => {
        currentMacroSteps.push({ type: 'text', payload: '' });
        saveActiveRectState();
        renderMacroSteps();
    });

    if (btnAddProfile) {
        btnAddProfile.addEventListener('click', () => {
            const defaultApp = apps.length > 0 ? apps[0].name : ("NewApp" + Date.now());
            let tempName = defaultApp;
            let counter = 1;
            while(config.smart_profiles[tempName]) {
                tempName = defaultApp + " " + counter;
                counter++;
            }
            config.smart_profiles[tempName] = "main";
            renderSmartProfiles();
        });
    }

    btnChooseIcon.addEventListener('click', () => {
        iconModal.style.display = 'block';
        populateIconGrid('');
    });
    closeIconModal.addEventListener('click', () => {
        iconModal.style.display = 'none';
    });
    iconSearch.addEventListener('input', (e) => {
        populateIconGrid(e.target.value);
    });

    btnNewPage.addEventListener('click', () => {
        const name = newPageName.value.trim();
        if (name && !config.pages[name]) {
            config.pages[name] = {};
            newPageName.value = '';
            renderPagesList();
            renderSmartProfiles();
        }
    });

    btnSaveAll.addEventListener('click', async () => {
        btnSaveAll.textContent = i18n[currentLang].btnSaving;
        await saveConfig();
        btnSaveAll.textContent = i18n[currentLang].btnSaveAll;
    });

    deviceSelect.addEventListener('change', async (e) => {
        currentDeviceId = e.target.value;
        if (currentDeviceId) {
            await fetchLayout();
            await fetchConfig();
            currentPage = "main";
            activeRectKey = null;
            updatePropertiesPanel();
            renderPagesList();
            renderCanvas();
            renderSmartProfiles();
        }
    });

    propImageDropzone.addEventListener('dragover', e => {
        e.preventDefault();
        propImageDropzone.classList.add('dragover');
    });
    propImageDropzone.addEventListener('dragleave', e => {
        e.preventDefault();
        propImageDropzone.classList.remove('dragover');
    });
    propImageDropzone.addEventListener('drop', async e => {
        e.preventDefault();
        propImageDropzone.classList.remove('dragover');
        if (!activeRectKey) return;
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (config.pages[currentPage] && config.pages[currentPage][activeRectKey]) {
                delete config.pages[currentPage][activeRectKey].lucide_icon;
            }
            if (file.type === 'image/gif') {
                try {
                    const res = await fetch('/api/upload_file', {
                        method: 'POST',
                        headers: {
                            'X-File-Name': file.name,
                            'Content-Type': file.type
                        },
                        body: file
                    });
                    const data = await res.json();
                    if (!config.pages[currentPage]) config.pages[currentPage] = {};
                    if (!config.pages[currentPage][activeRectKey]) config.pages[currentPage][activeRectKey] = {};
                    config.pages[currentPage][activeRectKey].image = data.path;
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        propImagePreview.src = re.target.result;
                        propImagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                    saveActiveRectState();
                } catch (err) {
                    console.error("GIF Upload failed", err);
                }
            } else if (file.type.startsWith('image/')) {
                currentCropFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('crop-image').src = e.target.result;
                    document.getElementById('crop-modal').style.display = 'block';
                    let rect;
                    if (activeRectKey.startsWith('extra_')) {
                        const idx = parseInt(activeRectKey.split('_')[1]);
                        rect = layout.rects[idx];
                    } else {
                        const [c, r] = activeRectKey.split('_');
                        rect = layout.rects.find(rt => rt.col == c && rt.row == r);
                    }
                    const ratio = rect ? rect.width / rect.height : 1;
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(document.getElementById('crop-image'), {
                        aspectRatio: ratio,
                        viewMode: 1
                    });
                };
                reader.readAsDataURL(file);
            }
        }
    });

    document.getElementById('btn-cancel-crop').addEventListener('click', () => {
        document.getElementById('crop-modal').style.display = 'none';
        if (cropper) cropper.destroy();
    });

    document.getElementById('btn-apply-crop').addEventListener('click', async () => {
        if (!cropper || !activeRectKey) return;
        let rect;
        if (activeRectKey.startsWith('extra_')) {
            const idx = parseInt(activeRectKey.split('_')[1]);
            rect = layout.rects[idx];
        } else {
            const [c, r] = activeRectKey.split('_');
            rect = layout.rects.find(rt => rt.col == c && rt.row == r);
        }
        const canvas = cropper.getCroppedCanvas({
            width: rect ? rect.width : 256,
            height: rect ? rect.height : 256
        });
        const base64Image = canvas.toDataURL('image/png');
        document.getElementById('crop-modal').style.display = 'none';
        
        const res = await fetch('/api/upload_base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: base64Image })
        });
        const data = await res.json();
        if (!config.pages[currentPage]) config.pages[currentPage] = {};
        if (!config.pages[currentPage][activeRectKey]) config.pages[currentPage][activeRectKey] = {};
        config.pages[currentPage][activeRectKey].image = data.path;
        propImagePreview.src = base64Image;
        propImagePreview.style.display = 'block';
        saveActiveRectState();
    });
}
// --- WIDGET LIBRARY ---
const btnSaveToLib = document.getElementById("btn-save-to-lib");
const savedWidgetsList = document.getElementById("saved-widgets-list");

function renderWidgetLibrary() {
    savedWidgetsList.innerHTML = '';
    const widgets = config.saved_widgets || [];
    
    if (widgets.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No saved widgets.";
        p.style.fontSize = "0.85rem";
        p.style.color = "#94a3b8";
        savedWidgetsList.appendChild(p);
        return;
    }
    
    widgets.forEach((w, i) => {
        const div = document.createElement('div');
        div.className = 'list-group li';
        div.style.padding = '10px';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.border = '1px solid rgba(255,255,255,0.1)';
        div.style.cursor = 'pointer';
        div.style.borderRadius = '6px';
        div.style.marginBottom = '8px';
        
        div.innerHTML = `
            <div style="font-weight:bold; font-size: 0.9rem;">${w.name || 'Widget ' + (i+1)}</div>
            <div style="font-size:0.75rem; color:#94a3b8;">${w.elements.length} elements</div>
        `;
        
        div.onclick = () => {
            if (activeRectKey) {
                if (!config.pages[currentPage]) config.pages[currentPage] = {};
                config.pages[currentPage][activeRectKey] = {
                    type: 'widget',
                    background: w.background,
                    image: w.image,
                    payload: { elements: JSON.parse(JSON.stringify(w.elements)) }
                };
                updatePropertiesPanel();
                renderCanvas();
                saveConfig();
            } else {
                alert("Select a button space first to load this widget.");
            }
        };
        savedWidgetsList.appendChild(div);
    });
}

if (btnSaveToLib) {
    btnSaveToLib.onclick = () => {
        const name = prompt("Enter a name for this widget:");
        if (name) {
            if (!config.saved_widgets) config.saved_widgets = [];
            
            const pageActions = config.pages[currentPage] || {};
            const currentRect = pageActions[activeRectKey] || {};
            
            config.saved_widgets.push({
                name: name,
                elements: JSON.parse(JSON.stringify(currentWidgetElements)),
                background: currentRect.background,
                image: currentRect.image
            });
            saveConfig();
            renderWidgetLibrary();
            alert("Saved to Library!");
        }
    };
}
async function saveConfig() {
    if (brightnessSlider) {
        if (!config.settings) config.settings = {};
        config.settings.brightness = parseInt(brightnessSlider.value);
    }
    await fetch(`/api/config?device_id=${encodeURIComponent(currentDeviceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
}

init();

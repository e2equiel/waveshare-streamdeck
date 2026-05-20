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
        actionClock: "Clock Widget",
        payloadLabel: "Payload",
        payloadApp: "Application",
        payloadHotkey: "Keys (e.g. command+c)",
        payloadPage: "Target Page",
        imageLabel: "Image",
        dragDropText: "Drag & Drop",
        emptyStateText: "Select an element on the canvas to edit its properties.",
        cropTitle: "Adjust Image",
        btnCancel: "Cancel",
        btnApply: "Apply",
        noDevices: "No devices found"
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
        actionClock: "Reloj",
        payloadLabel: "Carga Útil",
        payloadApp: "Aplicación",
        payloadHotkey: "Teclas (ej. command+c)",
        payloadPage: "Página Destino",
        imageLabel: "Imagen",
        dragDropText: "Arrastrar y Soltar",
        emptyStateText: "Selecciona un elemento en el lienzo para editar sus propiedades.",
        cropTitle: "Ajustar Imagen",
        btnCancel: "Cancelar",
        btnApply: "Aplicar",
        noDevices: "No se encontraron dispositivos"
    }
};

let currentLang = 'en';

let config = { pages: { main: {} }, settings: { brightness: 50 } };
let layout = { width: 896, height: 304, rects: [] };
let apps = [];
let currentPage = "main";
let activeRectKey = null; // e.g. "0_0" or "extra_0"
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
const propPayloadLabel = document.getElementById("prop-payload-label");
const propPayloadGroup = document.getElementById("prop-payload-group");

const propImageDropzone = document.getElementById("prop-image-dropzone");
const propImagePreview = document.getElementById("prop-image-preview");

// i18n Translator
function applyTranslations() {
    const t = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
    if (activeRectKey) updatePropertiesPanelTitle();
    updatePayloadVisibility(); // Update dynamic labels based on action
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
        // Use the actual device model from the device if available and valid, else fallback
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
    
    brightnessSlider.value = config.settings.brightness;
}

function renderPagesList() {
    pagesList.innerHTML = '';
    
    // Update the properties panel page selector as well
    propPageSelect.innerHTML = '';
    
    for (const pageName in config.pages) {
        // UI List
        const li = document.createElement('li');
        li.textContent = pageName;
        if (pageName === currentPage) li.classList.add('active');
        li.onclick = () => {
            currentPage = pageName;
            activeRectKey = null;
            renderPagesList();
            renderCanvas();
            updatePropertiesPanel();
        };
        pagesList.appendChild(li);
        
        // Select Options
        const opt = document.createElement('option');
        opt.value = pageName;
        opt.textContent = pageName;
        propPageSelect.appendChild(opt);
    }
}

function renderCanvas() {
    deckPreview.innerHTML = '';
    const pageData = config.pages[currentPage] || {};
    
    layout.rects.forEach((rect, index) => {
        const isKey = rect.isKey;
        const keyID = isKey ? `${rect.col}_${rect.row}` : `extra_${index}`;
        
        const el = document.createElement('div');
        el.className = 'deck-rect';
        if (keyID === activeRectKey) el.classList.add('active');
        
        // Convert exact physical coordinates to percentage based styling
        el.style.left = `${(rect.x / layout.width) * 100}%`;
        el.style.top = `${(rect.y / layout.height) * 100}%`;
        el.style.width = `${(rect.width / layout.width) * 100}%`;
        el.style.height = `${(rect.height / layout.height) * 100}%`;
        
        // Load image if exists
        const actionData = pageData[keyID];
        if (actionData && actionData.image) {
            const sep = actionData.image.includes('?') ? '&' : '?';
            el.style.backgroundImage = `url('${actionData.image}${sep}t=${Date.now()}')`;
        }
        
        el.onclick = () => {
            activeRectKey = keyID;
            renderCanvas(); // Update active class visually
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
    
    // Reset fields
    propAction.value = actionData ? actionData.type || "" : "";
    propPayload.value = actionData ? actionData.payload || "" : "";
    propAppSelect.value = actionData ? actionData.payload || "" : "";
    propPageSelect.value = actionData ? actionData.payload || "" : "";
    
    if (actionData && actionData.image) {
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
    propPayloadGroup.style.display = 'block';
    
    if (action === 'open_app') {
        propPayloadLabel.textContent = t.payloadApp;
        propAppSelect.style.display = 'block';
    } else if (action === 'hotkey') {
        propPayloadLabel.textContent = t.payloadHotkey;
        propPayload.style.display = 'block';
    } else if (action === 'switch_page') {
        propPayloadLabel.textContent = t.payloadPage;
        propPageSelect.style.display = 'block';
    } else if (action === 'clock') {
        propPayloadGroup.style.display = 'none';
    } else {
        propPayloadGroup.style.display = 'none';
    }
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
    
    // Check if auto-icon extraction needed
    if (action === 'open_app' && propAppSelect.value) {
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

    propPayload.addEventListener('input', saveActiveRectState);
    propAppSelect.addEventListener('change', saveActiveRectState);
    propPageSelect.addEventListener('change', saveActiveRectState);

    btnNewPage.addEventListener('click', () => {
        const name = newPageName.value.trim();
        if (name && !config.pages[name]) {
            config.pages[name] = {};
            newPageName.value = '';
            renderPagesList();
        }
    });

    btnSaveAll.addEventListener('click', async () => {
        config.settings.brightness = parseInt(brightnessSlider.value);
        
        btnSaveAll.textContent = i18n[currentLang].btnSaving;
        await fetch(`/api/config?device_id=${encodeURIComponent(currentDeviceId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
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
        }
    });

    // Drag and Drop & Cropper
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
                    
                    renderCanvas();
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
        renderCanvas();
    });
}

init();

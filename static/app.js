let config = { pages: { main: {} }, settings: { brightness: 50 } };
let layout = { width: 896, height: 304, rects: [] };
let apps = [];
let currentPage = "main";
let activeRectKey = null; // e.g. "0_0" or "extra_0"
let cropper = null;
let currentCropFile = null;

// DOM Elements
const pagesList = document.getElementById("pages-list");
const btnNewPage = document.getElementById("btn-new-page");
const newPageName = document.getElementById("new-page-name");
const deckPreview = document.getElementById("deck-preview");
const btnSaveAll = document.getElementById("btn-save-all");
const brightnessSlider = document.getElementById("brightness-slider");

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

async function init() {
    await fetchApps();
    await fetchLayout();
    await fetchConfig();
    
    renderPagesList();
    renderCanvas();
    setupEventListeners();
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
    const res = await fetch('/api/layout');
    layout = await res.json();
    deckPreview.style.width = layout.width + 'px';
    deckPreview.style.height = layout.height + 'px';
}

async function fetchConfig() {
    const res = await fetch('/api/config');
    config = await res.json();
    if (!config.pages) config.pages = { main: {} };
    if (!config.settings) config.settings = { brightness: 50 };
    
    brightnessSlider.value = config.settings.brightness;
}

function renderPagesList() {
    pagesList.innerHTML = '';
    
    // Update the properties panel page selector as well
    const currentOptions = Array.from(propPageSelect.options).map(o => o.value);
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

function updatePropertiesPanel(rect = null, keyID = null, actionData = null) {
    if (!keyID) {
        propertiesPanel.style.display = 'none';
        propertiesEmpty.style.display = 'block';
        return;
    }
    
    propertiesPanel.style.display = 'block';
    propertiesEmpty.style.display = 'none';
    
    propTitle.textContent = rect.isKey ? `Button (Col ${rect.col}, Row ${rect.row})` : `Extra Display`;
    
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
    propPayload.style.display = 'none';
    propAppSelect.style.display = 'none';
    propPageSelect.style.display = 'none';
    propPayloadGroup.style.display = 'block';
    
    if (action === 'open_app') {
        propPayloadLabel.textContent = "Application";
        propAppSelect.style.display = 'block';
    } else if (action === 'hotkey') {
        propPayloadLabel.textContent = "Keys (e.g. command+c)";
        propPayload.style.display = 'block';
    } else if (action === 'switch_page') {
        propPayloadLabel.textContent = "Target Page";
        propPageSelect.style.display = 'block';
    } else if (action === 'clock') {
        propPayloadGroup.style.display = 'none'; // Clocks might not need payload for now
    } else {
        propPayloadGroup.style.display = 'none';
    }
}

function saveActiveRectState() {
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
        const iconUrl = `/api/app_icon?app_path=${encodeURIComponent(propAppSelect.value)}`;
        pageData[activeRectKey].image = iconUrl;
        const sep = iconUrl.includes('?') ? '&' : '?';
        propImagePreview.src = `${iconUrl}${sep}t=${Date.now()}`;
        propImagePreview.style.display = 'block';
    }
    
    renderCanvas();
}

// Event Listeners
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
    
    btnSaveAll.textContent = "Saving...";
    await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    btnSaveAll.textContent = "Deploy / Save All";
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

propImageDropzone.addEventListener('drop', e => {
    e.preventDefault();
    propImageDropzone.classList.remove('dragover');
    if (!activeRectKey) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            currentCropFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('crop-image').src = e.target.result;
                document.getElementById('crop-modal').style.display = 'block';
                
                // Get rect aspect ratio
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
    
    // Get rect size
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
    
    // Upload
    const res = await fetch('/api/upload_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64Image })
    });
    const data = await res.json();
    
    if (!config.pages[currentPage]) config.pages[currentPage] = {};
    if (!config.pages[currentPage][activeRectKey]) config.pages[currentPage][activeRectKey] = {};
    
    // Force absolute path or relative path, ensure it works. 
    // Data returned is absolute path, let's keep it clean by using relative `/static/uploads/filename` if possible.
    // The server returns `abs_path`. Let's just use it, Python handles it.
    config.pages[currentPage][activeRectKey].image = data.path;
    
    propImagePreview.src = base64Image;
    propImagePreview.style.display = 'block';
    renderCanvas();
});

init();

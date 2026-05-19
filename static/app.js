document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('deckGrid');
    const currentBtnLabel = document.getElementById('currentBtn');
    const actionType = document.getElementById('actionType');
    const actionPayload = document.getElementById('actionPayload');
    const imagePath = document.getElementById('imagePath');
    const saveBtn = document.getElementById('saveBtn');
    
    // New Elements
    const appSelectGroup = document.getElementById('appSelectGroup');
    const payloadGroup = document.getElementById('payloadGroup');
    const appSelect = document.getElementById('appSelect');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    const cancelCrop = document.getElementById('cancelCrop');
    const applyCrop = document.getElementById('applyCrop');

    let currentConfig = {};
    let selectedCol = -1;
    let selectedRow = -1;
    let cropper = null;
    let appsLoaded = false;

    // Build 5x2 grid
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
            const btn = document.createElement('div');
            btn.className = 'deck-btn';
            btn.textContent = `${col},${row}`;
            btn.dataset.col = col;
            btn.dataset.row = row;
            btn.addEventListener('click', () => selectButton(col, row, btn));
            grid.appendChild(btn);
        }
    }

    async function loadApps() {
        if (appsLoaded) return;
        try {
            const res = await fetch('/api/apps');
            const apps = await res.json();
            appSelect.innerHTML = '<option value="">-- Selecciona --</option>';
            apps.forEach(app => {
                const opt = document.createElement('option');
                opt.value = app.path;
                opt.textContent = app.name;
                appSelect.appendChild(opt);
            });
            appsLoaded = true;
        } catch (e) {
            console.error("Failed to load apps", e);
        }
    }

    function selectButton(col, row, btnElement) {
        document.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');

        selectedCol = col;
        selectedRow = row;
        currentBtnLabel.textContent = `(${col}, ${row})`;

        const key = `${col}_${row}`;
        const conf = currentConfig[key] || { type: 'open_app', payload: '', image: '' };
        
        actionType.value = conf.type;
        actionPayload.value = typeof conf.payload === 'object' ? JSON.stringify(conf.payload) : conf.payload;
        imagePath.value = conf.image || '';
        
        updateUIForActionType();
        updateImagePreview(conf.image);
    }
    
    function updateImagePreview(path) {
        if (path) {
            // Append timestamp to bypass browser caching of 404s
            const sep = path.includes('?') ? '&' : '?';
            imagePreview.src = `${path}${sep}t=${Date.now()}`;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
    }

    function updateUIForActionType() {
        if (actionType.value === 'open_app') {
            appSelectGroup.style.display = 'block';
            payloadGroup.style.display = 'none';
            loadApps();
            // Try to set combo box
            Array.from(appSelect.options).forEach(opt => {
                if (opt.textContent === actionPayload.value || opt.value === actionPayload.value) {
                    appSelect.value = opt.value;
                }
            });
        } else {
            appSelectGroup.style.display = 'none';
            payloadGroup.style.display = 'block';
        }
    }

    actionType.addEventListener('change', updateUIForActionType);

    appSelect.addEventListener('change', async () => {
        if (!appSelect.value) return;
        const appName = appSelect.options[appSelect.selectedIndex].text;
        actionPayload.value = appName; // Just pass name to payload
        
        // Auto set icon
        const iconUrl = `/api/app_icon?app_path=${encodeURIComponent(appSelect.value)}`;
        imagePath.value = iconUrl;
        updateImagePreview(iconUrl);
    });

    // Drag and Drop
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return alert('Sólo imágenes');
        const reader = new FileReader();
        reader.onload = (e) => {
            cropImage.src = e.target.result;
            cropModal.classList.add('active');
            if (cropper) cropper.destroy();
            cropper = new Cropper(cropImage, {
                aspectRatio: 1, // Square crop for buttons
                viewMode: 1
            });
        };
        reader.readAsDataURL(file);
    }

    cancelCrop.addEventListener('click', () => cropModal.classList.remove('active'));

    applyCrop.addEventListener('click', async () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
        const base64Image = canvas.toDataURL('image/png');
        
        cropModal.classList.remove('active');
        
        try {
            const res = await fetch('/api/upload_base64', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: base64Image })
            });
            const data = await res.json();
            imagePath.value = data.path;
            updateImagePreview(data.path);
        } catch (e) {
            alert('Error subiendo imagen');
            console.error(e);
        }
    });

    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            currentConfig = await res.json();
        } catch (e) {
            console.error('Failed to load config', e);
        }
    }

    saveBtn.addEventListener('click', async () => {
        if (selectedCol === -1) return alert('Selecciona un botón primero');

        let payloadStr = actionPayload.value;
        let payloadParsed = payloadStr;
        try {
            if (payloadStr.startsWith('[')) {
                payloadParsed = JSON.parse(payloadStr);
            }
        } catch (e) {}

        const req = {
            col: selectedCol,
            row: selectedRow,
            action_type: actionType.value,
            payload: payloadParsed,
            image_path: imagePath.value
        };

        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            alert('Guardado!');
            loadConfig();
            
            // Re-select to refresh preview
            setTimeout(() => document.querySelector(`.deck-btn[data-col="${selectedCol}"][data-row="${selectedRow}"]`).click(), 500);
            
        } catch (e) {
            alert('Error guardando config');
        }
    });

    loadConfig();
});

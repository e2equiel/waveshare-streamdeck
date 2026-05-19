document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('deckGrid');
    const currentBtnLabel = document.getElementById('currentBtn');
    const actionType = document.getElementById('actionType');
    const actionPayload = document.getElementById('actionPayload');
    const imagePath = document.getElementById('imagePath');
    const saveBtn = document.getElementById('saveBtn');

    let currentConfig = {};
    let selectedCol = -1;
    let selectedRow = -1;

    // Build 5x3 grid (assuming 15 keys for Stream Deck 10? Wait, stream deck 10 usually has 10 keys: 5x2. Let's make it 5x2)
    // Adjusting CSS grid if needed, 5x2 is 10 buttons.
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
    }

    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            currentConfig = await res.json();
            console.log('Loaded config', currentConfig);
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
        } catch (e) {
            alert('Error guardando config');
        }
    });

    loadConfig();
});

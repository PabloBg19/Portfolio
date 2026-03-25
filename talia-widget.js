(function() {
    // 1. ESTILOS CSS
    const styles = `
    <style>
        #tw-workspace { position: fixed; inset: 0; z-index: 999999; pointer-events: none; font-family: 'DM Sans', sans-serif; }
        #tw-launcher { position: absolute; bottom: 30px; right: 30px; width: 75px; height: 42px; cursor: grab; pointer-events: auto; z-index: 1001; transition: transform 0.2s; }
        #tw-launcher:active { cursor: grabbing; transform: scale(0.95); }
        #tw-launcher:hover:not(:active) { transform: scale(1.1) rotate(-3deg); }
        #tw-launcher svg { width: 100%; height: 100%; filter: drop-shadow(0 8px 20px rgba(192, 38, 160, 0.4)); pointer-events: none; } 
        #tw-window { position: absolute; bottom: 90px; right: 30px; width: 800px; height: 650px; min-width: 350px; min-height: 300px; background: #0d0b14; border-radius: 16px; border: 1px solid rgba(192, 38, 160, 0.3); box-shadow: 0 30px 100px rgba(0,0,0,0.7); display: none; flex-direction: column; overflow: hidden; pointer-events: auto; animation: tw-pop 0.3s ease-out; transition: width 0.3s ease, height 0.3s ease, top 0.3s ease, left 0.3s ease, right 0.3s ease, bottom 0.3s ease; }
        #tw-window.active { display: flex; }
        #tw-window.dragging { transition: none !important; }
        .tw-resizer { position: absolute; width: 20px; height: 20px; right: 0; bottom: 0; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(192, 38, 160, 0.8) 50%); border-radius: 0 0 16px 0; z-index: 10; }
        #tw-topbar { background: #16141d; height: 45px; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; cursor: grab; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
        #tw-topbar:active { cursor: grabbing; }
        #tw-status { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
        .tw-pulse-dot { width: 7px; height: 7px; background: #c026a0; border-radius: 50%; box-shadow: 0 0 8px #c026a0; }
        .tw-controls { display: flex; gap: 8px; }
        .tw-ctrl-btn { width: 13px; height: 13px; border-radius: 50%; border: none; cursor: pointer; opacity: 0.8; transition: 0.2s;}
        .tw-ctrl-btn:hover { opacity: 1; transform: scale(1.1); }
        #tw-min { background: #febc2e; } #tw-max { background: #28c840; } #tw-cls { background: #ff5f57; }
        #tw-content { flex: 1; position: relative; background: #0d0b14; overflow: hidden; }
        #tw-frame { width: 100%; height: 100%; border: none; background: #0d0b14; }
        #tw-drag-overlay { position: absolute; inset: 0; display: none; z-index: 9; }
        #tw-loader { position: absolute; inset: 0; background: #0d0b14; display: flex; align-items: center; justify-content: center; z-index: 5; transition: opacity 0.3s; }
        .tw-spinner { width: 30px; height: 30px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #c026a0; border-radius: 50%; animation: tw-spin 0.8s linear infinite; }
        @keyframes tw-spin { to { transform: rotate(360deg); } }
        .tw-no-select { user-select: none; -webkit-user-select: none; }
        @keyframes tw-pop { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>`;
    document.head.insertAdjacentHTML('beforeend', styles);

    // 2. ESTRUCTURA HTML (Nuevas funciones asignadas a cada botón)
    const html = `
    <div id="tw-workspace">
        <div id="tw-launcher">
            <svg viewBox="0 0 66 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17,2 C8,2 1,9 1,18 C1,27 8,34 17,34 C23,34 28,30 33,24 C38,30 43,34 49,34 C58,34 65,27 65,18 C65,9 58,2 49,2 C43,2 38,6 33,12 C28,6 23,2 17,2 Z" fill="#0d0b14" stroke="#c026a0" stroke-width="2.5"/>
            </svg>
        </div>
        <div id="tw-window">
            <div id="tw-topbar">
                <div id="tw-status"><div class="tw-pulse-dot"></div><span>TALIA WORKSPACE</span></div>
                <div class="tw-controls">
                    <button class="tw-ctrl-btn" id="tw-min" onclick="window.twMinimizeTalia()" title="Minimizar"></button>
                    <button class="tw-ctrl-btn" id="tw-max" onclick="window.twFullscreenTalia()" title="Expandir"></button>
                    <button class="tw-ctrl-btn" id="tw-cls" onclick="window.twCloseTalia()" title="Cerrar y Resetear"></button>
                </div>
            </div>
            <div id="tw-content">
                <div id="tw-drag-overlay"></div>
                <div id="tw-loader"><div class="tw-spinner"></div></div>
                <iframe id="tw-frame"></iframe>
            </div>
            <div class="tw-resizer" id="tw-resizer"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    // 3. VARIABLES
    const launcher = document.getElementById('tw-launcher');
    const taliaWin = document.getElementById('tw-window');
    const taliaFrame = document.getElementById('tw-frame');
    const taliaLoader = document.getElementById('tw-loader');
    const dragOverlay = document.getElementById('tw-drag-overlay');
    const resizer = document.getElementById('tw-resizer');

    // --- LA URL REAL ---
    const baseUrl = 'https://www.rewoox.es/talia/public/talia_router.php?empresa=rewoox&slug=asistente-rewoox';

    // 4. SISTEMA DE MEMORIA Y SESIÓN
    let sessionId = localStorage.getItem('tw_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('tw_session_id', sessionId);
    }
    
    let finalUrl = baseUrl + '&session=' + sessionId;
    let isTaliaOpen = localStorage.getItem('tw_is_open') === 'true';
    let isTaliaFull = localStorage.getItem('tw_is_full') === 'true';
    let savedState = JSON.parse(localStorage.getItem('tw_saved_state')) || { w: '', h: '', t: '', l: '', r: '', b: '' };

    // Restaurar posición de las gafas
    let savedLauncherPos = JSON.parse(localStorage.getItem('tw_launcher_pos'));
    if (savedLauncherPos) {
        launcher.style.left = savedLauncherPos.l + 'px'; launcher.style.top = savedLauncherPos.t + 'px';
        launcher.style.right = 'auto'; launcher.style.bottom = 'auto';
    }

    function applyCustomStyles(state) {
        taliaWin.style.width = state.w || "800px"; taliaWin.style.height = state.h || "650px";
        taliaWin.style.top = state.t || "auto"; taliaWin.style.left = state.l || "auto";
        taliaWin.style.right = state.r || "30px"; taliaWin.style.bottom = state.b || "90px";
        resizer.style.display = "block";
    }

    function applyFullscreenStyles() {
        taliaWin.style.width = "96vw"; taliaWin.style.height = "90vh";
        taliaWin.style.top = "5vh"; taliaWin.style.left = "2vw";
        taliaWin.style.right = "auto"; taliaWin.style.bottom = "auto";
        resizer.style.display = "none";
    }

    // Auto-abrir si estaba activa al cambiar de página
    if (isTaliaOpen) {
        taliaWin.classList.add('active');
        taliaFrame.src = finalUrl; 
        taliaFrame.onload = function() {
            setTimeout(() => { taliaLoader.style.opacity = '0'; setTimeout(()=>taliaLoader.style.display='none',300) }, 300);
        };
        if (isTaliaFull) applyFullscreenStyles();
        else if (savedState.w || savedState.t) applyCustomStyles(savedState);
    }

    // 5. FUNCIONES DE LOS BOTONES Y VENTANAS
    
    // MINIMIZAR: Solo oculta, mantiene el chat vivo
    window.twMinimizeTalia = function() {
        isTaliaOpen = false;
        taliaWin.classList.remove('active'); 
        localStorage.setItem('tw_is_open', 'false');
    };

    // CERRAR: Oculta, destruye el iframe y reinicia la sesión para la próxima vez
    window.twCloseTalia = function() {
        isTaliaOpen = false;
        taliaWin.classList.remove('active');
        localStorage.setItem('tw_is_open', 'false');
        
        // ¡Magia del botón cerrar! Limpiamos el iframe y reseteamos el ID
        setTimeout(() => {
            taliaFrame.src = 'about:blank';
            localStorage.removeItem('tw_session_id');
            sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
            finalUrl = baseUrl + '&session=' + sessionId;
        }, 400); // Esperamos a que acabe la animación de cerrarse para no dar un pantallazo brusco
    };

    // ABRIR (Desde el botón flotante)
    window.twToggleTalia = function() {
        if (taliaWin.classList.contains('active')) {
            window.twMinimizeTalia();
        } else {
            isTaliaOpen = true;
            taliaWin.classList.add('active');
            localStorage.setItem('tw_is_open', 'true');

            // Carga la IA si está vacía
            if (!taliaFrame.src || taliaFrame.src === window.location.href || taliaFrame.src === 'about:blank') {
                taliaLoader.style.display = 'flex'; taliaLoader.style.opacity = '1';
                taliaFrame.src = finalUrl;
                taliaFrame.onload = function() {
                    setTimeout(() => { taliaLoader.style.opacity = '0'; setTimeout(()=>taliaLoader.style.display='none',300) }, 500);
                };
            }
        }
    };

    // MAXIMIZAR
    window.twFullscreenTalia = function() {
        taliaWin.classList.add('dragging'); 
        if (!isTaliaFull) {
            savedState = { w: taliaWin.style.width, h: taliaWin.style.height, t: taliaWin.style.top, l: taliaWin.style.left, r: taliaWin.style.right, b: taliaWin.style.bottom };
            localStorage.setItem('tw_saved_state', JSON.stringify(savedState));
            applyFullscreenStyles();
        } else {
            applyCustomStyles(savedState);
        }
        isTaliaFull = !isTaliaFull;
        localStorage.setItem('tw_is_full', isTaliaFull);
        setTimeout(() => taliaWin.classList.remove('dragging'), 50);
    };

    // 6. EVENTOS DE ARRASTRE (GAFAS Y VENTANA)
    
    // Arrastrar el botón de las gafas
    launcher.onmousedown = function(e) {
        let isDraggingLauncher = false;
        let startX = e.clientX, startY = e.clientY;
        let shiftX = e.clientX - launcher.getBoundingClientRect().left; 
        let shiftY = e.clientY - launcher.getBoundingClientRect().top;
        
        function moveAt(pageX, pageY) {
            let newLeft = Math.max(0, Math.min(pageX - shiftX, window.innerWidth - launcher.offsetWidth));
            let newTop = Math.max(0, Math.min(pageY - shiftY, window.innerHeight - launcher.offsetHeight));
            launcher.style.left = newLeft + 'px'; launcher.style.top = newTop + 'px';
            launcher.style.right = 'auto'; launcher.style.bottom = 'auto';
        }

        function onMouseMove(ev) {
            if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
                isDraggingLauncher = true; document.body.classList.add('tw-no-select'); moveAt(ev.clientX, ev.clientY);
            }
        }

        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove); document.onmouseup = null; document.body.classList.remove('tw-no-select');
            if (isDraggingLauncher) {
                localStorage.setItem('tw_launcher_pos', JSON.stringify({ l: parseInt(launcher.style.left), t: parseInt(launcher.style.top) }));
            } else {
                window.twToggleTalia();
            }
        };
    };
    launcher.ondragstart = () => false;

    // Arrastrar la ventana de la IA
    const topbar = document.getElementById('tw-topbar');
    topbar.onmousedown = function(e) {
        if (isTaliaFull || e.target.closest('.tw-ctrl-btn')) return; 
        document.body.classList.add('tw-no-select'); taliaWin.classList.add('dragging'); dragOverlay.style.display = 'block';
        let shiftX = e.clientX - taliaWin.getBoundingClientRect().left; let shiftY = e.clientY - taliaWin.getBoundingClientRect().top;
        
        function moveAt(pageX, pageY) { taliaWin.style.left = pageX - shiftX + 'px'; taliaWin.style.top = pageY - shiftY + 'px'; taliaWin.style.bottom = 'auto'; taliaWin.style.right = 'auto'; }
        function onMouseMove(e) { moveAt(e.clientX, e.clientY); }
        
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = function() { 
            dragOverlay.style.display = 'none'; taliaWin.classList.remove('dragging'); document.body.classList.remove('tw-no-select'); 
            document.removeEventListener('mousemove', onMouseMove); document.onmouseup = null; 
            savedState = { w: taliaWin.style.width, h: taliaWin.style.height, t: taliaWin.style.top, l: taliaWin.style.left, r: taliaWin.style.right, b: taliaWin.style.bottom };
            localStorage.setItem('tw_saved_state', JSON.stringify(savedState));
        };
    };

    // Redimensionar la ventana de la IA
    resizer.onmousedown = function(e) {
        e.preventDefault(); document.body.classList.add('tw-no-select'); taliaWin.classList.add('dragging'); dragOverlay.style.display = 'block';
        let startWidth = taliaWin.offsetWidth; let startHeight = taliaWin.offsetHeight; let startX = e.clientX; let startY = e.clientY;
        
        function onMouseMove(e) {
            const newWidth = startWidth + (e.clientX - startX); const newHeight = startHeight + (e.clientY - startY);
            if (newWidth > 350) taliaWin.style.width = newWidth + 'px'; if (newHeight > 300) taliaWin.style.height = newHeight + 'px';
        }
        function onMouseUp() { 
            dragOverlay.style.display = 'none'; taliaWin.classList.remove('dragging'); document.body.classList.remove('tw-no-select'); 
            document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); 
            savedState = { w: taliaWin.style.width, h: taliaWin.style.height, t: taliaWin.style.top, l: taliaWin.style.left, r: taliaWin.style.right, b: taliaWin.style.bottom };
            localStorage.setItem('tw_saved_state', JSON.stringify(savedState));
        }
        document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    };

    // Permitir clics fuera de la ventana
    document.addEventListener('mousedown', (e) => {
        const workspace = document.getElementById('tw-workspace');
        if (launcher.contains(e.target) || taliaWin.contains(e.target)) { workspace.style.pointerEvents = 'auto'; } 
        else { workspace.style.pointerEvents = 'none'; }
    }, true);
})();
// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

let carregados = {
    rodizio: false,
    retroA: false,
    retroB: false,
    manual: false
};

// --- NOVO: MEMÓRIA DE ALARMES (PERSISTÊNCIA) ---
let falhasAtivas = JSON.parse(localStorage.getItem('fenix_falhas')) || {};

// ==========================================================
// CONFIGURAÇÃO FIREBASE
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  databaseURL: "https://fenix-smart-control-default-rtdb.firebaseio.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var messaging = firebase.messaging();
}

// ==========================================================
// FUNÇÕES DE INTERFACE (ESTRUTURA ORIGINAL RECOMPILADA)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    if (state === "1") {
        btn.textContent = "DESLIGAR: Central";
        btn.className = "btn-toggle-power power-on";
    } else {
        btn.textContent = "LIGAR: Central";
        btn.className = "btn-toggle-power power-off";
    }
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";
    bar.className = "cloro-bar-fill";
    if (valor <= 20) bar.classList.add("cloro-low");
    else if (valor <= 50) bar.classList.add("cloro-mid");
    else bar.classList.add("cloro-high");
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val === "1") ? "COM FLUXO" : "SEM FLUXO";
    if (motor) {
        if (val === "1") motor.classList.add("spinning");
        else motor.classList.remove("spinning");
    }
}

// ==========================================================
// LÓGICA DE ALARMES (APENAS ADICIONADA)
// ==========================================================
function processarAlarmeCentral(alarme) {
    if (alarme.falha.includes("Normalizado") || alarme.status === "OK") {
        falhasAtivas = {}; 
    } else if (alarme.status === "FALHA") {
        const idFalha = alarme.falha.split(":")[0]; 
        falhasAtivas[idFalha] = { msg: alarme.falha, hora: new Date().toLocaleTimeString() };
        
        // Modal de alerta imediato
        const modal = document.getElementById("alarm_modal");
        if (modal) {
            document.getElementById("modal_msg").textContent = alarme.falha.split(".")[0];
            document.getElementById("modal_solucao").textContent = alarme.falha.split("Solucao: ")[1] || "";
            modal.style.display = "flex";
        }
    }
    localStorage.setItem('fenix_falhas', JSON.stringify(falhasAtivas));
    renderizarAlarmesMemoria();
}

function renderizarAlarmesMemoria() {
    const list = document.getElementById("alarm_list");
    if (!list) return;
    const chaves = Object.keys(falhasAtivas);
    if (chaves.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:#2ecc71; padding:15px;">✅ SISTEMA OK</li>';
        return;
    }
    list.innerHTML = "";
    chaves.forEach(key => {
        const item = falhasAtivas[key];
        list.innerHTML += `<li class="history-item" style="border-left:4px solid #e74c3c; margin-bottom:8px;">
            <div style="color:#e74c3c; font-weight:bold;">⚠️ ${item.msg}</div>
            <div style="font-size:0.8em; color:#888;">${item.hora}</div>
        </li>`;
    });
}

// ==========================================================
// FUNÇÃO ONMESSAGE - RESTAURADA COM LÓGICA DE CONFIGURAÇÃO
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Indicador de Central Online
    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        const st = document.getElementById("central_status");
        if(st) st.className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); updatePowerButton(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "SOLICITANDO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
        
        // Sincronização dos Inputs de Configuração (O que tinha parado de funcionar)
        case "smart_level/central/rodizio_min": 
            if(!carregados.rodizio) { document.getElementById("cfg_rodizio_m").value = val; carregados.rodizio = true; }
            break;
        case "smart_level/central/retroA_status": 
            if(!carregados.retroA) { document.getElementById("cfg_retroA").value = val; carregados.retroA = true; }
            break;
        case "smart_level/central/retroB_status": 
            if(!carregados.retroB) { document.getElementById("cfg_retroB").value = val; carregados.retroB = true; }
            break;
        case "smart_level/central/manual_poco": 
            if(!carregados.manual) { document.getElementById("cfg_manual_p").value = val; carregados.manual = true; }
            break;

        // Histórico e Online dos Poços
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/retro_history_json": 
            try {
                const hist = JSON.parse(val);
                const list = document.getElementById("history_list");
                if(list) {
                    list.innerHTML = "";
                    hist.forEach(h => list.innerHTML += `<li class="history-item"><strong>${h.data}</strong>: ${h.inicio} às ${h.fim}</li>`);
                }
            } catch(e) {}
            break;

        // Alarme Detalhado (O novo ajuste)
        case "smart_level/central/alarmes_detalhes":
            try { processarAlarmeCentral(JSON.parse(val)); } catch(e) {}
            break;
    }
}

// ==========================================================
// ENVIO DE CONFIGURAÇÕES (BOTÃO SALVAR)
// ==========================================================
document.getElementById("btnSalvarConfig")?.addEventListener("click", () => {
    const rM = document.getElementById("cfg_rodizio_m").value;
    const rA = document.getElementById("cfg_retroA").value;
    const rB = document.getElementById("cfg_retroB").value;
    const mP = document.getElementById("cfg_manual_p").value;

    const payload = JSON.id = JSON.stringify({
        rodizio: parseInt(rM),
        retroA: parseInt(rA),
        retroB: parseInt(rB),
        manual_poco: mP
    });

    const msg = new Paho.MQTT.Message(payload);
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configurações enviadas!");
});

// ==========================================================
// RESTANTE DAS FUNÇÕES (MQTT, SW, WATCHDOG) - MANTIDAS
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#");
            renderizarAlarmesMemoria();
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

document.getElementById("btnToggle").addEventListener("click", () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('firebase-messaging-sw.js').then((reg) => {
        if (typeof messaging !== 'undefined') {
            messaging.getToken({ serviceWorkerRegistration: reg, vapidKey: 'BE0nwKcod9PklpQv8gS_z3H7d3LSvsDQ3D1-keaIQf64djg_sHPpBp03IRPQ8JnXyWPr5WeGaYE3c1S-Qv9B0Bc' })
            .then((token) => {
                if (token) {
                    fetch('https://ponte-fenix.onrender.com/inscrever', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token })
                    }).then(() => localStorage.setItem('fb_token', token));
                }
            });
        }
    });
}

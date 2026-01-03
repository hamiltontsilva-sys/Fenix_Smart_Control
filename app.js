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

let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// --- FUNÇÃO PARA NOTIFICAÇÃO (Nativa + Service Worker) ---
function dispararNotificacao(titulo, msg) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        // Tenta enviar via Service Worker (melhor para celular)
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: msg,
                icon: "logo.jpg",
                badge: "logo.jpg",
                vibrate: [200, 100, 200]
            });
        }).catch(() => {
            // Fallback para notificação simples se o SW falhar
            new Notification(titulo, { body: msg, icon: "logo.jpg" });
        });
    }
}

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

function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        const el = document.getElementById("central_status");
        if (el) el.className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/alarmes_detalhes":
            try {
                const alarme = JSON.parse(val);
                const modal = document.getElementById("alarm-modal");
                if (alarme.status === "FALHA") {
                    if (document.getElementById("modal-falha")) document.getElementById("modal-falha").textContent = alarme.falha;
                    if (document.getElementById("modal-solucao")) document.getElementById("modal-solucao").textContent = alarme.solucao;
                    if (modal) modal.style.display = "flex";
                    dispararNotificacao("ALERTA FÊNIX", alarme.falha);
                } else {
                    if (modal) modal.style.display = "none";
                }
            } catch (e) { console.error("Erro no JSON de alarme"); }
            break;

        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            updatePowerButton(val);
            break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (!carregados.rodizio) {
                const total = parseInt(val);
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = Math.floor(total / 60);
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = total % 60;
                carregados.rodizio = true;
            }
            break;

        case "smart_level/central/retroA_status": 
            setText("retroA_status", "Poço " + val);
            if (!carregados.retroA && document.getElementById("cfg_retroA")) { 
                document.getElementById("cfg_retroA").value = val; 
                carregados.retroA = true; 
            }
            break;

        case "smart_level/central/retroB_status": 
            setText("retroB_status", "Poço " + val);
            if (!carregados.retroB && document.getElementById("cfg_retroB")) { 
                document.getElementById("cfg_retroB").value = val; 
                carregados.retroB = true; 
            }
            break;

        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val);
            if (!carregados.manual && document.getElementById("cfg_manual_poco")) { 
                document.getElementById("cfg_manual_poco").value = val; 
                carregados.manual = true; 
            }
            break;

        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => { 
        setText("mqtt_status", "MQTT: Reconectando...");
        if (document.getElementById("mqtt_status")) document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000); 
    };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            if (document.getElementById("mqtt_status")) document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
            if ("Notification" in window) Notification.requestPermission();
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Eventos de Botões
const btnToggle = document.getElementById("btnToggle");
if (btnToggle) {
    btnToggle.addEventListener("click", () => {
        const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
        msg.destinationName = "smart_level/central/cmd";
        if (client && client.isConnected()) client.send(msg);
    });
}

const btnSalvar = document.getElementById("btnSalvarConfig");
if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
        const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
        const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
        const config = {
            rodizio: (h * 60) + m,
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        };
        const msg = new Paho.MQTT.Message(JSON.stringify(config));
        msg.destinationName = "smart_level/central/cmd";
        if (client && client.isConnected()) {
            client.send(msg);
            alert("Configurações enviadas!");
        }
    });
}

// Watchdog para status offline
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

// Inicialização
initMQTT();

// Registro do Service Worker para Notificações PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log("Service Worker registrado com sucesso.");
    });
}

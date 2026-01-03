// ==========================================================
// 1. INICIALIZAÇÃO ONESIGNAL (NOTIFICAÇÕES PUSH & SININHO)
// ==========================================================
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "c2ca5be4-e0ca-4cf8-a6c6-dc42d6963a57",
        allowLocalhostAsSecureOrigin: true,
        // Configuração vital para GitHub Pages (Subpasta)
        serviceWorkerParam: { scope: "/Fenix_Smart_Control/" },
        serviceWorkerPath: "OneSignalSDKWorker.js",
        notifyButton: {
            enable: true, // ATIVA O SININHO
            size: 'medium',
            position: 'bottom-right',
            displayPredicate: () => true, // Obriga a aparecer sempre
            text: {
                'tip.state.unsubscribed': 'Inscrever-se para notificações',
                'tip.state.subscribed': 'Você está inscrito',
                'tip.state.blocked': 'Você bloqueou as notificações',
                'message.prenotify': 'Clique para receber alertas de falha',
                'dialog.main.title': 'Gerenciar Notificações',
                'dialog.main.button.subscribe': 'INSCREVER',
                'dialog.main.button.unsubscribe': 'REMOVER'
            },
            colors: {
                'circle.background': 'rgb(255, 0, 0)', // SINO VERMELHO
                'circle.foreground': 'white',
                'badge.background': 'rgb(255, 0, 0)',
                'badge.foreground': 'white'
            }
        },
    });

    // Tenta solicitar permissão automaticamente ao carregar
    OneSignal.Notifications.requestPermission();
});

// ==========================================================
// 2. LÓGICA DE INSTALAÇÃO (PWA)
// ==========================================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("Sistema pronto para instalação.");
});

// ==========================================================
// 3. CONFIGURAÇÃO MQTT
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

// ==========================================================
// 4. FUNÇÕES DE INTERFACE & STATUS
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
    bar.className = "cloro-bar-fill " + (valor <= 20 ? "cloro-low" : valor <= 50 ? "cloro-mid" : "cloro-high");
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
// 5. GESTÃO DE ALARMES
// ==========================================================
function abrirAlarme(dados) {
    const modal = document.getElementById("modal_alarme");
    if (!modal) return;
    if (dados.status === "OK") { fecharAlarme(); return; }

    let local = dados.poco === "0" ? "Central / Cloro" : "Poço " + dados.poco;
    setText("alarme_poco", local);
    setText("alarme_msg", dados.falha || "Erro desconhecido");
    setText("alarme_solucao", dados.solucao || "Verificar painel local");
    modal.style.display = "flex";
}

function fecharAlarme() {
    const modal = document.getElementById("modal_alarme");
    if (modal) modal.style.display = "none";
}
window.fecharAlarme = fecharAlarme;

// ==========================================================
// 6. COMUNICAÇÃO MQTT (PROCESSAMENTO)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        const st = document.getElementById("central_status");
        if(st) st.className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); updatePowerButton(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;

        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (!carregados.rodizio) {
                const total = parseInt(val);
                document.getElementById("cfg_rodizio_h").value = Math.floor(total / 60);
                document.getElementById("cfg_rodizio_m").value = total % 60;
                carregados.rodizio = true;
            }
            break;

        case "smart_level/central/alarmes_detalhes":
            try { abrirAlarme(JSON.parse(val)); } catch(e) { console.error("Erro JSON Alarme"); }
            break;

        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;

        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val, "p1_motor"); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val, "p2_motor"); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val, "p3_motor"); break;

        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.random().toString(16).substr(2, 8);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => { setTimeout(initMQTT, 5000); };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            const ms = document.getElementById("mqtt_status");
            if(ms) ms.className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Eventos de Botão
document.getElementById("btnToggle").addEventListener("click", () => {
    client.send("smart_level/central/cmd", JSON.stringify({ toggle: true }));
});

if(document.getElementById("btnSalvarConfig")) {
    document.getElementById("btnSalvarConfig").addEventListener("click", () => {
        const config = {
            rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value) * 60) + parseInt(document.getElementById("cfg_rodizio_m").value),
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        };
        client.send("smart_level/central/cmd", JSON.stringify(config));
        alert("Configurações enviadas!");
    });
}

// Monitor de poços offline
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();

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
// FUNÇÕES DE INTERFACE E LIMPEZA
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function limparInterfaceAoDesligar() {
    setText("sistema", "DESLIGADO");
    setText("retrolavagem", "---");
    setText("nivel", "---");
    setText("manual", "---");
    setText("retroA_status", "---");
    setText("retroB_status", "---");
    setText("poco_ativo", "---");
    setText("poco_manual_sel", "---");
    setText("rodizio_min", "--- min");
    setText("cloro_peso", "--- kg");
    updateCloroBar(0);
    ["p1", "p2", "p3"].forEach(p => {
        setText(p + "_timer", "00:00");
        setOnlineStatus(p + "_online", "0");
        setFluxo(p + "_fluxo", "0", p + "_motor");
    });
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
// ALARMES E HISTÓRICO (MODIFICADO PARA 30 ITENS E RETAIN)
// ==========================================================
function showAlarmModal(msgCompleta) {
    const modal = document.getElementById("alarm_modal");
    const msgEl = document.getElementById("modal_msg");
    const solEl = document.getElementById("modal_solucao");
    if (!modal || !msgEl || !solEl) return;
    const partes = msgCompleta.split(". Solucao: ");
    msgEl.textContent = partes[0] || "Falha no Sistema";
    solEl.textContent = partes[1] || "Verificar painel físico da central.";
    modal.style.display = "flex";
}

function addAlarmToList(msg) {
    const list = document.getElementById("alarm_list");
    if (!list) return;
    if (list.innerText.includes("Nenhum")) list.innerHTML = "";
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
    const li = document.createElement("li");
    li.className = "alarm-item";
    li.style.padding = "10px"; li.style.borderBottom = "1px solid #eee";
    li.innerHTML = `<strong>${timeStr}</strong> - ${msg}`;
    list.prepend(li);
}

function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px"; li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Monitoramento da Central
    if (topic === "smart_level/central/sistema") {
        if (val === "1") {
            setText("central_status", "Central: Online");
            document.getElementById("central_status").className = "status-on";
            setText("sistema", "LIGADO");
            updatePowerButton("1");
        } else {
            setText("central_status", "Central: Offline");
            document.getElementById("central_status").className = "status-off";
            updatePowerButton("0");
            limparInterfaceAoDesligar();
        }
    }

    // NOVA LÓGICA DE ALARME (FIXO)
    if (topic === "smart_level/central/alarme_estado") {
        try {
            const alarme = JSON.parse(val);
            if (alarme.status === "FALHA") {
                showAlarmModal(alarme.detalhes + ". Solucao: " + alarme.solucao);
                addAlarmToList(alarme.erro);
                if(alarme.id === 8) {
                    setText("central_status", "Central: OFF-LINE (Link)");
                    document.getElementById("central_status").className = "status-off";
                }
            } else {
                const modal = document.getElementById("alarm_modal");
                if (modal) modal.style.display = "none";
            }
        } catch(e) {}
    }

    switch (topic) {
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = Math.floor(parseInt(val)/60);
            if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = parseInt(val)%60;
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
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// ==========================================================
// EVENTOS DE BOTÕES
// ==========================================================
document.getElementById("btnToggle").addEventListener("click", () => {
    if (!client) return;
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    if (!client) return;
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
    client.send(msg);
    alert("Configurações enviadas!");
});

// BOTÃO RESET DE TARA (BALANÇA)
const btnResetTara = document.getElementById("btnResetTara");
if (btnResetTara) {
    btnResetTara.addEventListener("click", () => {
        if (!client || !confirm("Deseja zerar a balança? Certifique-se que o galão foi retirado!")) return;
        const msg = new Paho.MQTT.Message(JSON.stringify({ reset_tara: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    });
}

initMQTT();

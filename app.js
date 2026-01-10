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
// FUNÇÕES DE INTERFACE
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
    } catch (e) { console.error("Erro ao processar histórico:", e); }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    console.log(`%c[MQTT] %c${topic} %c-> ${val}`, "color:#007bff", "color:#28a745; font-weight:bold", "color:#333; background:#f0f0f0");

    if (topic.includes("central")) {
        setText("central_status", "Central: Online");
        const st = document.getElementById("central_status");
        if(st) st.className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); updatePowerButton(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            const totMin = parseInt(val);
            const elH = document.getElementById("cfg_rodizio_h");
            const elM = document.getElementById("cfg_rodizio_m");
            if (elH && document.activeElement !== elH) elH.value = Math.floor(totMin / 60);
            if (elM && document.activeElement !== elM) elM.value = totMin % 60;
            break;

        case "smart_level/central/manual_poco": 
            setText("poco_manual_sel", val);
            const elMan = document.getElementById("cfg_manual_poco");
            if (elMan && document.activeElement !== elMan) elMan.value = val;
            break;

        // Telemetria (Horas e Consumo)
        case "smart_level/telemetry/p1":
            try {
                const p1 = JSON.parse(val);
                setText("p1_total_h", p1.hrtp.toFixed(2));
                setText("p1_parcial_h", p1.hrpp.toFixed(2));
                setText("p1_kwh", p1.kwhp.toFixed(2));
                setText("p1_reais", p1.vkwh.toFixed(2));
            } catch(e) {}
            break;
        case "smart_level/telemetry/p2":
            try {
                const p2 = JSON.parse(val);
                setText("p2_total_h", p2.hrtp.toFixed(2));
                setText("p2_parcial_h", p2.hrpp.toFixed(2));
                setText("p2_kwh", p2.kwhp.toFixed(2));
                setText("p2_reais", p2.vkwh.toFixed(2));
            } catch(e) {}
            break;
        case "smart_level/telemetry/p3":
            try {
                const p3 = JSON.parse(val);
                setText("p3_total_h", p3.hrtp.toFixed(2));
                setText("p3_parcial_h", p3.hrpp.toFixed(2));
                setText("p3_kwh", p3.kwhp.toFixed(2));
                setText("p3_reais", p3.vkwh.toFixed(2));
            } catch(e) {}
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

// FUNÇÃO PARA ZERAR (Adicionada ao escopo global)
window.zerarParcial = function(pocoNum) {
    if (!client || !client.isConnected()) {
        alert("MQTT Desconectado!");
        return;
    }
    if (confirm(`Deseja zerar horas parciais do Poço ${pocoNum}?`)) {
        const topic = `smart_level/central/p${pocoNum}/cmd`;
        const payload = JSON.stringify({ "reset_parcial": 1 });
        const message = new Paho.MQTT.Message(payload);
        message.destinationName = topic;
        client.send(message);
    }
};

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = (err) => {
        setText("mqtt_status", "MQTT: Reconectando...");
        setTimeout(initMQTT, 5000);
    };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            const st = document.getElementById("mqtt_status");
            if(st) st.className = "status-on";
            client.subscribe("smart_level/central/#");
            client.subscribe("smart_level/telemetry/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Listeners de botões
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
    "rodizio": (h * 60) + m,
    "retroA": parseInt(document.getElementById("cfg_retroA").value),
    "retroB": parseInt(document.getElementById("cfg_retroB").value),
    "manual_poco": document.getElementById("cfg_manual_poco").value,
    "p1_pkw": parseFloat(document.getElementById("cfg_pot1")?.value) || 0,
    "p2_pkw": parseFloat(document.getElementById("cfg_pot2")?.value) || 0,
    "p3_pkw": parseFloat(document.getElementById("cfg_pot3")?.value) || 0,
    "preco_kw": parseFloat(document.getElementById("cfg_pkwh")?.value) || 0
};
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configurações enviadas!");
});

setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();

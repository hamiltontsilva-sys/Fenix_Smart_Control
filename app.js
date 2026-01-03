const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "DESLIGAR: Central" : "LIGAR: Central";
    btn.className = "btn-toggle-power " + (state === "1" ? "power-on" : "power-off");
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val === "1") ? "COM FLUXO" : "SEM FLUXO";
}

function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const dataHora = item.data || item.date || "---";
            const numPoco = item.poco || item.id || "0";
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #eee";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.innerHTML = `<span>${dataHora}</span> <b style="color:#0047ba">Poço 0${numPoco}</b>`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro no histórico:", e); }
}

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic.includes("central")) {
        setText("central_status", "CENTRAL: ONLINE");
        document.getElementById("central_status").className = "status-on";
    }

    switch (topic) {
        case "smart_level/central/sistema": setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); updatePowerButton(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "CHEIO" : "SOLICITADO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
        case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
        case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;
        case "smart_level/central/p1_fluxo": setFluxo("p1_fluxo", val); break;
        case "smart_level/central/p2_fluxo": setFluxo("p2_fluxo", val); break;
        case "smart_level/central/p3_fluxo": setFluxo("p3_fluxo", val); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
        case "smart_level/central/rodizio_min": setText("rodizio_min", val + " min"); break;
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Desconectado");
        setTimeout(initMQTT, 5000);
    };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: CONECTADO");
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Eventos de Botão (Garantir que os IDs existem antes de atribuir)
window.addEventListener('load', () => {
    const btnT = document.getElementById("btnToggle");
    if(btnT) btnT.onclick = () => {
        const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    };

    const btnS = document.getElementById("btnSalvarConfig");
    if(btnS) btnS.onclick = () => {
        const config = {
            rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value)*60) + parseInt(document.getElementById("cfg_rodizio_m").value),
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        };
        const msg = new Paho.MQTT.Message(JSON.stringify(config));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
        alert("Configurações enviadas!");
    };
    initMQTT();
});

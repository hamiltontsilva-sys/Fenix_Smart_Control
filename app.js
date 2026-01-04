// ==========================================================
// 1. ESTADO E CONFIGURAÇÃO
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

// Para não sobrescrever o que o usuário digita enquanto os dados chegam
let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// ==========================================================
// 2. COMUNICAÇÃO MQTT (O MOTOR)
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);

    client.onConnectionLost = (err) => {
        document.getElementById("mqtt_status").textContent = "MQTT: DESCONECTADO";
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = (msg) => {
        const topic = msg.destinationName;
        const val = msg.payloadString;

        // --- Processamento de Status e Sensores ---
        switch (topic) {
            case "smart_level/central/sistema": updatePowerButton(val); setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO"); break;
            case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
            case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO SOLICITADO" : "CHEIO"); break;
            case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
            case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
            
            // PESO / NÍVEL DOS POÇOS
            case "smart_level/central/p1_nivel": setText("p1_timer", val + "%"); break;
            case "smart_level/central/p2_nivel": setText("p2_timer", val + "%"); break;
            case "smart_level/central/p3_nivel": setText("p3_timer", val + "%"); break;

            // STATUS ONLINE
            case "smart_level/central/p1_online": lastP1 = Date.now(); setOnlineStatus("p1_online", val); break;
            case "smart_level/central/p2_online": lastP2 = Date.now(); setOnlineStatus("p2_online", val); break;
            case "smart_level/central/p3_online": lastP3 = Date.now(); setOnlineStatus("p3_online", val); break;

            // CONFIGURAÇÕES (Preenche os selects e inputs automaticamente)
            case "smart_level/central/cfg_rodizio": 
                if(!carregados.rodizio) {
                    const totalMin = parseInt(val);
                    document.getElementById("cfg_rodizio_h").value = Math.floor(totalMin / 60);
                    document.getElementById("cfg_rodizio_m").value = totalMin % 60;
                    setText("rodizio_val", val + " min");
                    carregados.rodizio = true;
                }
                break;
            case "smart_level/central/cfg_retroA": if(!carregados.retroA) { document.getElementById("cfg_retroA").value = val; setText("retroa_val", "Poço " + val); carregados.retroA = true; } break;
            case "smart_level/central/cfg_retroB": if(!carregados.retroB) { document.getElementById("cfg_retroB").value = val; setText("retrob_val", "Poço " + val); carregados.retroB = true; } break;
            case "smart_level/central/cfg_manual_poco": if(!carregados.manual) { document.getElementById("cfg_manual_poco").value = val; setText("manual_val", val); carregados.manual = true; } break;

            // HISTÓRICO
            case "smart_level/central/historico":
                atualizarHistorico(val);
                break;
        }
    };

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            document.getElementById("mqtt_status").textContent = "MQTT: CONECTADO";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// ==========================================================
// 3. FUNÇÕES DE SUPORTE (UI)
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state === "1" || state === "ONLINE");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "DESLIGAR: CENTRAL" : "LIGAR: CENTRAL";
    btn.className = "btn-toggle-power " + (state === "1" ? "power-on" : "power-off");
}

function atualizarHistorico(jsonStr) {
    try {
        const logs = JSON.parse(jsonStr);
        const lista = document.getElementById("lista-historico");
        if (!lista) return;
        lista.innerHTML = "";
        logs.forEach(log => {
            const item = document.createElement("div");
            item.className = "historico-item";
            item.innerHTML = `<strong>${log.t}</strong>: ${log.m}`;
            lista.appendChild(item);
        });
    } catch (e) { console.error("Erro no histórico:", e); }
}

// ==========================================================
// 4. EVENTOS E INICIALIZAÇÃO
// ==========================================================
function setup() {
    // Botão Power
    const btnToggle = document.getElementById("btnToggle");
    if (btnToggle) btnToggle.onclick = () => {
        if (client) client.send(new Paho.MQTT.Message(JSON.stringify({ toggle: true })), "smart_level/central/cmd");
    };

    // Botão Salvar Config
    const btnSalvar = document.getElementById("btnSalvarConfig");
    if (btnSalvar) btnSalvar.onclick = () => {
        const cfg = {
            rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value) * 60) + parseInt(document.getElementById("cfg_rodizio_m").value),
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        };
        client.send(new Paho.MQTT.Message(JSON.stringify(cfg)), "smart_level/central/cmd");
        alert("Configurações Enviadas!");
    };
}

window.onload = () => {
    initMQTT();
    setup();
    // Se o código de notificações Firebase estiver no seu app.js, mantenha a chamada aqui
    if (typeof inicializarNotificacoes === "function") inicializarNotificacoes();
};

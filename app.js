// ==========================================================
// CONFIGURAÇÃO GLOBAL
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let clientA = null;
let clientB = null;
let clientC = null;

let history = [];
let retroHistoryLoaded = false;

// ==========================================================
// WATCHDOG / DETECÇÃO DE OFFLINE (NOVO)
// ==========================================================
// timestamps (ms) do último pacote recebido de cada poço
let lastP1 = 0;
let lastP2 = 0;
let lastP3 = 0;

// tempo de timeout para considerar OFFLINE (em segundos)
const OFFLINE_TIMEOUT = 10; // ajuste se quiser (10s por padrão)

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("status-online", "status-offline");

    if (state === "1") {
        el.textContent = "ONLINE";
        el.classList.add("status-online");
    } else {
        el.textContent = "OFFLINE";
        el.classList.add("status-offline");
    }
}

/**
 * setFluxo(id, val)
 * id: id do elemento de texto do fluxo, ex: "p1_fluxo"
 * val: "1" -> Presente, qualquer outro -> Ausente
 *
 * Além de atualizar o texto / classes, controla o ícone do motor
 * cujo id deve seguir o padrão p1_motor, p2_motor, p3_motor.
 */
function setFluxo(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("fluxo-presente", "fluxo-ausente");

    if (val === "1" || val === 1) {
        el.textContent = "Presente";
        el.classList.add("fluxo-presente");
    } else {
        el.textContent = "Ausente";
        el.classList.add("fluxo-ausente");
    }

    // controle do ícone do motor (animação)
    try {
        const motorId = id.replace("_fluxo", "_motor");
        const motorEl = document.getElementById(motorId);
        if (motorEl) {
            if (val === "1" || val === 1) {
                motorEl.classList.add("motor-on");
            } else {
                motorEl.classList.remove("motor-on");
            }
        }
    } catch (e) {
        // não crítico — apenas segue sem animação se algo der errado
        console.warn("Falha ao atualizar motor icon:", e);
    }
}

function renderHistory() {
    const ul = document.getElementById("history_list");
    if (!ul) return;
    ul.innerHTML = "";
    history.slice(0, 50).forEach(h => {
        const li = document.createElement("li");
        li.textContent = h;
        ul.appendChild(li);
    });
}

// ==========================================================
// STATUS MQTT + CENTRAL (ADICIONADO)
// ==========================================================
let mqttConnected = false;
let centralOnline = false;

function updateStatusIndicators() {
    const mqttEl = document.getElementById("mqtt_status");
    const centEl = document.getElementById("central_status");

    if (mqttEl) {
        if (mqttConnected) {
            mqttEl.textContent = "MQTT: Conectado";
            mqttEl.classList.remove("status-off");
            mqttEl.classList.add("status-ok");
        } else {
            mqttEl.textContent = "MQTT: Desconectado";
            mqttEl.classList.remove("status-ok");
            mqttEl.classList.add("status-off");
        }
    }

    if (centEl) {
        if (centralOnline) {
            centEl.textContent = "Central: Online";
            centEl.classList.remove("status-off");
            centEl.classList.add("status-ok");
        } else {
            centEl.textContent = "Central: Offline";
            centEl.classList.remove("status-ok");
            centEl.classList.add("status-off");
        }
    }
}

// ==========================================================
// DEBUG
// ==========================================================
function debugLog(label, topic, payload) {
    const time = new Date().toLocaleTimeString();
    console.log(`%c[${label}] ${time} | ${topic} => ${payload}`, "color: green; font-weight: bold;");
}

// ==========================================================
// HANDLER PRINCIPAL DO PAINEL
// ==========================================================
function dashboardHandler(topic, v) {

    switch (topic) {

        case "smart_level/central/sistema":
            const isOn = (v === "1");
            setText("sistema", isOn ? "ON" : "OFF");
            const btn = document.getElementById("btnToggle");
            const txt = document.getElementById("toggleText");

            if (isOn) {
                if (btn) btn.classList.add("on");
                if (txt) txt.textContent = "Desligar Central";
            } else {
                if (btn) btn.classList.remove("on");
                if (txt) txt.textContent = "Ligar Central";
            }

            // <<< ADIÇÃO: atualiza indicador de Central >>>
            centralOnline = isOn;
            updateStatusIndicators();
            break;

        case "smart_level/central/poco_ativo":
            setText("poco_ativo", v);
            break; // CORRIGIDO
        
      
        case "smart_level/central/retrolavagem":
            // v = "0" ou "1"
            setText("retrolavagem", v === "1" ? "Retrolavando" : "Controle de Nível");
            break;

        case "smart_level/central/nivel":
            // v = "0" ou "1"
            setText("nivel", v === "1" ? "Enchendo" : "Cheio");
            break;

        case "smart_level/central/retroA_status":
            // mostra exatamente o que a central enviar (1, 2 ou 3)
            setText("retroA_status", v);
            break;

        case "smart_level/central/retroB_status":
            setText("retroB_status", v);
            break;
 
        case "smart_level/central/manual_poco":
            setText("poco_manual_sel", v);

            const sel = document.getElementById("cfg_manual_poco");
            if (sel) sel.value = v;
            break;

        case "smart_level/central/manual":
            setText("manual", v === "1" ? "MANUAL" : "AUTO");
            break;

        case "smart_level/central/rodizio_min":
            setText("rodizio_min", v);
            break;

        case "smart_level/central/p1_online":
            setOnlineStatus("p1_online", v);
            // se central reporta ONLINE, atualiza last timestamp para evitar falso offline
            if (v === "1") lastP1 = Date.now();
            else lastP1 = 0;
            break;

        case "smart_level/central/p2_online":
            setOnlineStatus("p2_online", v);
            if (v === "1") lastP2 = Date.now();
            else lastP2 = 0;
            break;

        case "smart_level/central/p3_online":
            setOnlineStatus("p3_online", v);
            if (v === "1") lastP3 = Date.now();
            else lastP3 = 0;
            break;

        case "smart_level/central/p1_timer":
            setText("p1_timer", v);
            break;

        case "smart_level/central/p2_timer":
            setText("p2_timer", v);
            break;

        case "smart_level/central/p3_timer":
            setText("p3_timer", v);
            break;

        case "smart_level/central/retro_history_json":
            try {
                const arr = JSON.parse(v);
                history = arr.map(h => `[${h.data}] início: ${h.inicio} | fim: ${h.fim}`);
                renderHistory();
            } catch (e) {
                console.error("ERRO ao ler retro_history_json:", e);
            }
            break;
    }
}

// ==========================================================
// CLIENTE A – tópicos principais
// ==========================================================
const topicsA = [
    "smart_level/central/sistema",
    "smart_level/central/poco_ativo",
    "smart_level/central/manual",
    "smart_level/central/rodizio_min",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",
    "smart_level/central/manual_poco"
];

function startClientA() {
    clientA = new Paho.MQTT.Client(host, port, path, "clientA_" + Math.random());

    // quando perder conexão, atualiza indicador e tenta reconectar
    clientA.onConnectionLost = () => {
        mqttConnected = false;
        centralOnline = false; // se o broker caiu, não temos certeza do estado da central
        updateStatusIndicators();
        setTimeout(startClientA, 2000);
    };

    clientA.onMessageArrived = msg => {
        debugLog("CLIENTE A", msg.destinationName, msg.payloadString);
        dashboardHandler(msg.destinationName, msg.payloadString);
    };

    clientA.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => {
            // marca MQTT como conectado e atualiza indicador
            mqttConnected = true;
            updateStatusIndicators();

            topicsA.forEach(t => clientA.subscribe(t));
            publish("smart_level/central/cmd", JSON.stringify({ getHistory: true }));
        }
    });
}

// ==========================================================
// CLIENTE B – tópicos pesados
// ==========================================================
const topicsB = [
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/retro_history_json",
    "smart_level/central/retrolavagem",
    "smart_level/central/nivel",
    "smart_level/central/retroA_status",
    "smart_level/central/retroB_status"
];

function startClientB() {
    clientB = new Paho.MQTT.Client(host, port, path, "clientB_" + Math.random());

    clientB.onConnectionLost = () => {
        mqttConnected = false;
        updateStatusIndicators();
        setTimeout(startClientB, 2000);
    };

    clientB.onMessageArrived = msg => {
        debugLog("CLIENTE B", msg.destinationName, msg.payloadString);
        dashboardHandler(msg.destinationName, msg.payloadString);
    };

    clientB.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topicsB.forEach(t => clientB.subscribe(t));
        }
    });
}

// ==========================================================
// CLIENTE C – poços
// ==========================================================
const topicsC = [
    "smart_level/poco1/feedback",
    "smart_level/poco2/feedback",
    "smart_level/poco3/feedback",
    "smart_level/poco1/timer",
    "smart_level/poco2/timer",
    "smart_level/poco3/timer"
];

function onMessageC(msg) {
    const t = msg.destinationName;
    const v = msg.payloadString;

    debugLog("CLIENTE C", t, v);

    // Atualiza timestamp "last seen" do poço correspondente
    if (t.startsWith("smart_level/poco1/")) lastP1 = Date.now();
    if (t.startsWith("smart_level/poco2/")) lastP2 = Date.now();
    if (t.startsWith("smart_level/poco3/")) lastP3 = Date.now();

    // garantir que poço seja marcado ONLINE quando receber mensagens diretas dele
    if (t.startsWith("smart_level/poco1/")) setOnlineStatus("p1_online", "1");
    if (t.startsWith("smart_level/poco2/")) setOnlineStatus("p2_online", "1");
    if (t.startsWith("smart_level/poco3/")) setOnlineStatus("p3_online", "1");

    switch (t) {
        case "smart_level/poco1/feedback": setFluxo("p1_fluxo", v); break;
        case "smart_level/poco2/feedback": setFluxo("p2_fluxo", v); break;
        case "smart_level/poco3/feedback": setFluxo("p3_fluxo", v); break;
        case "smart_level/poco1/timer": setText("p1_timer", v); break;
        case "smart_level/poco2/timer": setText("p2_timer", v); break;
        case "smart_level/poco3/timer": setText("p3_timer", v); break;
    }
}

function startClientC() {
    clientC = new Paho.MQTT.Client(host, port, path, "clientC_" + Math.random());

    clientC.onConnectionLost = () => {
        mqttConnected = false;
        updateStatusIndicators();
        setTimeout(startClientC, 2000);
    };
    clientC.onMessageArrived = onMessageC;

    clientC.connect({
        userName: username,
        password: password,
        useSSL: useTLS,
        timeout: 4,
        onSuccess: () => {
            mqttConnected = true;
            updateStatusIndicators();
            topicsC.forEach(t => clientC.subscribe(t));
        }
    });
}

// ==========================================================
// PUBLICAR COMANDOS
// ==========================================================
function publish(topic, payload) {
    if (clientA && clientA.isConnected()) {
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = topic;
        clientA.send(msg);
    }
}

// ==========================================================
// BOTÕES
// ==========================================================
document.getElementById("btnSend").addEventListener("click", () => {
    const obj = {
        rodizio: Number(document.getElementById("cfg_rodizio").value),
        retroA: Number(document.getElementById("cfg_retroA").value),
        retroB: Number(document.getElementById("cfg_retroB").value),
        timeout: Number(document.getElementById("cfg_timeout").value),
        manual_poco: Number(document.getElementById("cfg_manual_poco").value)
    };

    publish("smart_level/central/cmd", JSON.stringify(obj));

    const st = document.getElementById("cfg_status");
    st.textContent = "Configuração enviada!";
    st.classList.add("show");

    setTimeout(() => {
        st.classList.remove("show");
    }, 4000);
});

// BOTÃO LIGA / DESLIGA
document.getElementById("btnToggle").addEventListener("click", () => {
    publish("smart_level/central/cmd", JSON.stringify({ toggle: 1 }));
});

// ==========================================================
// WATCHDOG: verifica se poços ficaram sem sinal e aggiorna UI
// ==========================================================
setInterval(() => {
    const now = Date.now();

    // POÇO 1
    if (lastP1 === 0 || (now - lastP1) > OFFLINE_TIMEOUT * 1000) {
        // marca offline & fluxo ausente
        setOnlineStatus("p1_online", "0");
        setFluxo("p1_fluxo", "0");
    }

    // POÇO 2
    if (lastP2 === 0 || (now - lastP2) > OFFLINE_TIMEOUT * 1000) {
        setOnlineStatus("p2_online", "0");
        setFluxo("p2_fluxo", "0");
    }

    // POÇO 3
    if (lastP3 === 0 || (now - lastP3) > OFFLINE_TIMEOUT * 1000) {
        setOnlineStatus("p3_online", "0");
        setFluxo("p3_fluxo", "0");
    }
}, 2000); // checa a cada 2 segundos

// ==========================================================
// INICIAR CLIENTES
// ==========================================================
startClientA();
startClientB();
startClientC();

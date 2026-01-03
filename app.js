// ==========================================================
// 1. SISTEMA DE NOTIFICAÇÕES NATIVAS (SEM ONESIGNAL)
// ==========================================================
function inicializarNotificacoes() {
    if (!("Notification" in window)) {
        console.log("Notificações não suportadas neste navegador.");
        return;
    }

    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function enviarNotificacaoSistema(titulo, mensagem) {
    if (Notification.permission === "granted") {
        new Notification(titulo, {
            body: mensagem,
            icon: "logo.jpg" 
        });
    }
}

// Inicia o pedido de permissão ao abrir o site
inicializarNotificacoes();

// ==========================================================
// 2. CONFIGURAÇÃO GLOBAL - MQTT
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

// ==========================================================
// 3. FUNÇÕES DE INTERFACE
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
// 4. FUNÇÕES DE ALARME (COM GATILHO DE NOTIFICAÇÃO)
// ==========================================================
function abrirAlarme(dados) {
    const modal = document.getElementById("modal_alarme");
    if (modal) {
        if (dados.status === "OK") {
            fecharAlarme();
            return;
        }

        let valorPoco = String(dados.poco); 
        let localTratado = valorPoco;

        if (valorPoco === "1") localTratado = "Poço 1";
        else if (valorPoco === "2") localTratado = "Poço 2";
        else if (valorPoco === "3") localTratado = "Poço 3";
        else if (valorPoco === "0") localTratado = "Central / Cloro";

        setText("alarme_poco", localTratado);
        setText("alarme_msg", dados.falha || "Erro desconhecido");
        setText("alarme_solucao", dados.solucao || "Verificar disjuntor e contactor no local");
        
        modal.style.display = "flex";

        // DISPARA NOTIFICAÇÃO NO SISTEMA
        enviarNotificacaoSistema("ALERTA FÊNIX: " + localTratado, dados.falha);
    }
}

function fecharAlarme() {
    const modal = document.getElementById("modal_alarme");
    if (modal) modal.style.display = "none";
}
window.fecharAlarme = fecharAlarme;

// ==========================================================
// 5. LÓGICA DE HISTÓRICO
// ==========================================================
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
    } catch (e) { console.error("Erro histórico:", e); }
}

// ==========================================================
// 6. COMUNICAÇÃO MQTT (ESTRUTURA ORIGINAL PRESERVADA)
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
        case "smart_level/central/sistema": 
            setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
            updatePowerButton(val);
            break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "SOLICITADO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
        
        case "smart_level/central/rodizio_min": 
            setText("rodizio_min", val + " min");
            if (!carregados.rodizio) {
                const totalMinutos = parseInt(val);
                const h = Math.floor(totalMinutos / 60);
                const m = totalMinutos % 60;
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = h;
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = m;
                carregados.rodizio = true;
            }
            break;
        
        case "smart_level/central/alarmes_detalhes":
            try {
                const alarme = JSON.parse(val);
                abrirAlarme(alarme);
            } catch(e) { console.error("Erro no JSON de alarme", e); }
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
    client.onConnectionLost = (err) => {
        setText("mqtt_status", "MQTT: Reconectando...");
        const ms = document.getElementById("mqtt_status");
        if(ms) ms.className = "status-off";
        setTimeout(initMQTT, 5000);
    };
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

// ==========================================================
// 7. EVENTOS E MONITORAMENTO
// ==========================================================
document.getElementById("btnToggle").addEventListener("click", () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

if(document.getElementById("btnSalvarConfig")) {
    document.getElementById("btnSalvarConfig").addEventListener("click", () => {
        const config = {
            rodizio: (parseInt(document.getElementById("cfg_rodizio_h").value) * 60) + parseInt(document.getElementById("cfg_rodizio_m").value),
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        };
        const msg = new Paho.MQTT.Message(JSON.stringify(config));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
        alert("Configurações enviadas!");
    });
}

setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

initMQTT();

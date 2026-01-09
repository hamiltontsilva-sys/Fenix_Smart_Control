// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT (Mantida)
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
const OFFLINE_TIMEOUT = 45;

let carregados = { rodizio: false, retroA: false, retroB: false, manual: false };

// ==========================================================
// CONFIGURAÇÃO FIREBASE (Mantida)
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
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    if (state == "1") {
        btn.textContent = "DESLIGAR: Central";
        btn.className = "btn-toggle-power power-on";
    } else {
        btn.textContent = "LIGAR: Central";
        btn.className = "btn-toggle-power power-off";
    }
}

function updateCloroBar(peso) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    // Converte peso (0-100kg) em porcentagem simples para a barra
    let pct = Math.max(0, Math.min(100, parseFloat(peso) || 0));
    bar.style.width = pct + "%";
    txt.textContent = pct.toFixed(1) + " kg";
    bar.className = "cloro-bar-fill " + (pct <= 20 ? "cloro-low" : pct <= 50 ? "cloro-mid" : "cloro-high");
}

function setOnlineStatus(id, isOnline) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val == "1") ? "COM FLUXO" : "SEM FLUXO";
    if (motor) val == "1" ? motor.classList.add("spinning") : motor.classList.remove("spinning");
}

function showAlarmModal(msgCompleta) {
    const modal = document.getElementById("alarm_modal");
    const msgEl = document.getElementById("modal_msg");
    const solEl = document.getElementById("modal_solucao");
    if (!modal) return;
    const partes = msgCompleta.split(". Solucao: ");
    if(msgEl) msgEl.textContent = partes[0] || "Falha no Sistema";
    if(solEl) solEl.textContent = partes[1] || "Verificar painel físico.";
    modal.style.display = "flex";
}

// ==========================================================
// PROCESSAMENTO DO NOVO JSON AGRUPADO (A Chave do Sucesso)
// ==========================================================
function processarStatusGeral(payload) {
    try {
        const d = JSON.parse(payload);

        // 1. Status Central e Botão Power
        setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO");
        updatePowerButton(d.ligado);
        setText("modo_operacao", d.modo); // Se tiver esse ID no seu HTML
        setText("poco_ativo", "Poço " + d.ativo);
        
        // 2. Cloro
        updateCloroBar(d.cloro_kg);
        setText("cloro_peso", d.cloro_kg + " kg");

        // 3. Sensores Físicos
        setText("manual", d.manu == 1 ? "MANUAL" : "AUTO");
        setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");

        // 4. Sincronizar Configurações (Apenas na primeira vez)
        if (!carregados.rodizio) {
            const h = Math.floor(d.cfg_rod / 60);
            const m = d.cfg_rod % 60;
            if(document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = h;
            if(document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = m;
            if(document.getElementById("cfg_retroA")) document.getElementById("cfg_retroA").value = d.cfg_ra;
            if(document.getElementById("cfg_retroB")) document.getElementById("cfg_retroB").value = d.cfg_rb;
            if(document.getElementById("cfg_manual_poco")) document.getElementById("cfg_manual_poco").value = d.cfg_m;
            carregados.rodizio = true;
        }

        // 5. Atualizar Poços (Loops para P1, P2 e P3)
        d.pocos.forEach((p, i) => {
            const id = i + 1;
            setOnlineStatus(`p${id}_online`, p.on == 1);
            setFluxo(`p${id}_fluxo`, p.fl, `p${id}_motor`);
            
            // Cálculo de Energia
            let kwh = (p.par / 3600) * p.kw;
            let custo = kwh * d.cfg_tar;
            
            setText(`p${id}_timer`, (p.tot / 3600).toFixed(1) + "h"); // Tempo Total em horas
            setText(`p${id}_kwh`, kwh.toFixed(2) + " kWh");
            setText(`p${id}_custo`, "R$ " + custo.toFixed(2));
            setText(`p${id}_reset_dt`, p.dt);
        });

    } catch (e) {
        console.error("Erro ao processar JSON Geral:", e);
    }
}

// ==========================================================
// COMUNICAÇÃO MQTT
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Novo Tópico Unificado
    if (topic === "smart_level/central/status_geral") {
        processarStatusGeral(val);
        setText("mqtt_status", "MQTT: Conectado (Recebendo)");
    } 
    // Alarmes
    else if (topic === "smart_level/central/alarmes") {
        try {
            const alarme = JSON.parse(val);
            showAlarmModal(alarme.falha);
        } catch(e) {}
    }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    
    client.onConnectionLost = (err) => {
        setText("mqtt_status", "MQTT: Desconectado");
        setTimeout(initMQTT, 5000);
    };

    client.onMessageArrived = onMessage;

    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral");
            client.subscribe("smart_level/central/alarmes");
            client.subscribe("smart_level/central/cmd");
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// ==========================================================
// BOTÕES DE AÇÃO
// ==========================================================
document.getElementById("btnToggle").addEventListener("click", () => {
    if (!client || !client.connected) return;
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
});

document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    if (!client || !client.connected) return;
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

// Função para Reset de Energia (Adicional)
function zerarEnergia(id) {
    const msg = new Paho.MQTT.Message(JSON.stringify({ reset_parcial: id }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
}

initMQTT();

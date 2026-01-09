// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const username = "Admin";
const password = "Admin";

let client = null;
let carregados = { rodizio: false };

// Configuração Firebase (Fiel ao seu original)
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

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state == 1);
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.style.color = isOnline ? "#27ae60" : "#e74c3c";
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val == 1) ? "COM FLUXO" : "SEM FLUXO";
    if (motor) {
        val == 1 ? motor.classList.add("spinning") : motor.classList.remove("spinning");
    }
}

// ==========================================================
// PROCESSAMENTO DO JSON UNIFICADO (CENTRAL -> APP)
// ==========================================================
function onMessage(msg) {
    if (msg.destinationName === "smart_level/central/status_geral") {
        try {
            const d = JSON.parse(msg.payloadString);

            // 1. Status Geral e Rodízio
            setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO");
            setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");
            setText("manual", d.manu == 1 ? "MANUAL" : "AUTO");
            setText("rodizio_min", d.cfg_rod + " min"); 
            setText("poco_ativo", "Poço " + d.ativo);
            setText("retroA_status", "Poço " + d.cfg_ra);
            setText("retroB_status", "Poço " + d.cfg_rb);
            setText("poco_manual_sel", "P" + d.cfg_m);

            // 2. Cloro
            setText("cloro_peso", d.cloro_kg + " kg");
            const bar = document.getElementById("cloro_bar");
            if (bar) bar.style.width = (parseFloat(d.cloro_kg) * 10) + "%";

            // 3. Poços e Timers (Calculado a partir de 'tot')
            const listaH = document.getElementById("history_list");
            if (listaH) listaH.innerHTML = ""; 

            d.pocos.forEach((p, i) => {
                const id = i + 1;
                setOnlineStatus(`p${id}_online`, p.on);
                setFluxo(`p${id}_fluxo`, p.fl, `p${id}_motor`);
                
                // Timer: converte segundos (tot) para horas
                const horas = (p.tot / 3600).toFixed(2);
                setText(`p${id}_timer`, horas + "h");

                // Histórico de Operação
                const li = document.createElement("li");
                li.className = "history-item";
                li.style.padding = "10px";
                li.style.borderBottom = "1px solid #eee";
                li.innerHTML = `<strong>Poço 0${id}</strong>: Acumulado ${horas}h de uso`;
                listaH.appendChild(li);
            });

            // Sincroniza campos de configuração na primeira carga
            if (!carregados.rodizio) {
                document.getElementById("cfg_rodizio_h").value = Math.floor(d.cfg_rod / 60);
                document.getElementById("cfg_rodizio_m").value = d.cfg_rod % 60;
                document.getElementById("cfg_retroA").value = d.cfg_ra;
                document.getElementById("cfg_retroB").value = d.cfg_rb;
                document.getElementById("cfg_manual_poco").value = d.cfg_m;
                carregados.rodizio = true;
            }

        } catch (e) { console.error("Erro no JSON:", e); }
    }
}

// ==========================================================
// CONEXÃO E COMANDOS (APP -> CENTRAL)
// ==========================================================
function initMQTT() {
    client = new Paho.MQTT.Client(host, port, path, "Fenix_App_" + Math.random().toString(16).slice(2, 8));
    client.onMessageArrived = onMessage;
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Desconectado");
        setTimeout(initMQTT, 5000);
    };

    client.connect({
        useSSL: true, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral");
        }
    });
}

// Botão Ligar/Desligar
document.getElementById("btnToggle").onclick = () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
};

// Botão Salvar Configurações
document.getElementById("btnSalvarConfig").onclick = () => {
    const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
    const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
    const config = {
        cfg_rod: (h * 60) + m,
        cfg_ra: parseInt(document.getElementById("cfg_retroA").value),
        cfg_rb: parseInt(document.getElementById("cfg_retroB").value),
        cfg_m: document.getElementById("cfg_manual_poco").value
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configurações enviadas!");
};

initMQTT();

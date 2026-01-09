// ==========================================================
// CONFIGURAÇÃO GLOBAL
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const username = "Admin";
const password = "Admin";

let client = null;
let carregados = { configs: false };

// Configuração Firebase (Mantida do seu original)
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  databaseURL: "https://fenix-smart-control-default-rtdb.firebaseio.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

if (typeof firebase !== 'undefined') { firebase.initializeApp(firebaseConfig); }

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
    const isOnline = (state == 1 || state == "1");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE";
    el.className = "value " + (isOnline ? "status-online" : "status-offline");
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val == 1 || val == "1") ? "COM FLUXO" : "SEM FLUXO";
    if (motor) {
        (val == 1 || val == "1") ? motor.classList.add("spinning") : motor.classList.remove("spinning");
    }
}

// ==========================================================
// PROCESSAMENTO DO JSON UNIFICADO
// ==========================================================
function onMessage(msg) {
    if (msg.destinationName === "smart_level/central/status_geral") {
        try {
            const d = JSON.parse(msg.payloadString);

            // DEBUG NO CONSOLE PARA VOCÊ VER SE O ARRAY CHEGOU VAZIO
            console.log("📦 Dados Recebidos:", d);
            if (d.retro_history && d.retro_history.length === 0) {
                console.warn("⚠️ A central enviou o histórico de retro VAZIO.");
            }

            // 1. DASHBOARD PRINCIPAL
            setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO");
            setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");
            setText("manual", d.manu == 1 ? "MANUAL" : "AUTO");
            setText("rodizio_min", d.cfg_rod + " min");
            setText("poco_ativo", "Poço " + d.ativo);
            setText("retroA_status", "Poço " + d.cfg_ra);
            setText("retroB_status", "Poço " + d.cfg_rb);
            setText("poco_manual_sel", "P" + d.cfg_m);
            setText("cloro_peso", d.cloro_kg + " kg");

            // 2. POÇOS (DASHBOARD E ELÉTRICO)
            d.pocos.forEach((p, i) => {
                const id = i + 1;
                setOnlineStatus(`p${id}_online`, p.on);
                setFluxo(`p${id}_fluxo`, p.fl, `p${id}_motor`);
                setText(`p${id}_timer`, (p.tot / 60).toFixed(1) + " min");

                // Consumo Elétrico
                const consumoKwh = (p.tot / 3600) * (p.kw || 1.5);
                const custoReal = consumoKwh * (d.cfg_tar || 0.85);
                setText(`p${id}_kwh`, consumoKwh.toFixed(2) + " kWh");
                setText(`p${id}_custo`, "R$ " + custoReal.toFixed(2));
            });

            // 3. ABA HISTÓRICO - 2 CARDS
            const listaH = document.getElementById("history_list");
            if (listaH) {
                listaH.innerHTML = ""; 

                // CARD 1: ACUMULADOS
                const h1 = document.createElement("li");
                h1.innerHTML = `<div style="padding:12px; font-weight:800; color:#2980b9; background:#e1f5fe; border-radius:8px; margin-bottom:10px;">⏱️ TEMPO DE USO (ACUMULADO)</div>`;
                h1.style.listStyle = "none";
                listaH.appendChild(h1);

                d.pocos.forEach((p, i) => {
                    const li = document.createElement("li");
                    li.className = "history-item";
                    li.innerHTML = `<strong>POÇO 0${i+1}</strong> <span style="float:right">Acumulado ${(p.tot/60).toFixed(1)} min</span>`;
                    listaH.appendChild(li);
                });

                // CARD 2: RETROLAVAGENS
                const h2 = document.createElement("li");
                h2.innerHTML = `<div style="padding:12px; font-weight:800; color:#e67e22; background:#fff3e0; border-radius:8px; margin-top:20px; margin-bottom:10px;">🔄 HISTÓRICO DE RETROLAVAGEM</div>`;
                h2.style.listStyle = "none";
                listaH.appendChild(h2);

                if (d.retro_history && d.retro_history.length > 0) {
                    d.retro_history.forEach(item => {
                        const li = document.createElement("li");
                        li.className = "history-item";
                        li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
                        listaH.appendChild(li);
                    });
                } else {
                    const liVazio = document.createElement("li");
                    liVazio.style.textAlign = "center";
                    liVazio.style.padding = "10px";
                    liVazio.innerHTML = `<small style="color: #999;">Nenhuma retro registrada pela central</small>`;
                    listaH.appendChild(liVazio);
                }
            }

            // Sincroniza Configs
            if (!carregados.configs) {
                document.getElementById("cfg_rodizio_h").value = Math.floor(d.cfg_rod / 60);
                document.getElementById("cfg_rodizio_m").value = d.cfg_rod % 60;
                document.getElementById("cfg_retroA").value = d.cfg_ra;
                document.getElementById("cfg_retroB").value = d.cfg_rb;
                document.getElementById("cfg_manual_poco").value = d.cfg_m;
                carregados.configs = true;
            }

        } catch (e) { console.error("Erro no JSON:", e); }
    }
}

// ==========================================================
// CONEXÃO MQTT
// ==========================================================
function initMQTT() {
    client = new Paho.MQTT.Client(host, port, "/mqtt", "Fenix_" + Math.random().toString(16).slice(2, 8));
    client.onMessageArrived = onMessage;
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);
    client.connect({
        useSSL: true, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral");
        }
    });
}

initMQTT();

const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const username = "Admin";
const password = "Admin";

let client = null;
let carregados = { configs: false };

// Funções Auxiliares de Interface
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
    if (el) el.textContent = (val == 1) ? "COM FLUXO" : "SEM FLUXO";
    if (motor && val == 1) motor.classList.add("spinning");
    else if (motor) motor.classList.remove("spinning");
}

// Processamento da Mensagem Principal
function onMessage(msg) {
    if (msg.destinationName === "smart_level/central/status_geral") {
        try {
            const d = JSON.parse(msg.payloadString);

            // Dashboard Geral
            setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO");
            setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL");
            setText("manual", d.manu == 1 ? "MANUAL" : "AUTO");
            setText("rodizio_min", d.cfg_rod + " min"); // <--- Tempo do rodízio corrigido
            setText("poco_ativo", "Poço " + d.ativo);
            setText("retroA_status", "Poço " + d.cfg_ra);
            setText("retroB_status", "Poço " + d.cfg_rb);
            setText("poco_manual_sel", "P" + d.cfg_m);
            setText("cloro_peso", d.cloro_kg + " kg");

            // Processamento de cada Poço (Timer, kWh e Custo)
            const listH = document.getElementById("history_list");
            if (listH) listH.innerHTML = ""; 

            d.pocos.forEach((p, i) => {
                const id = i + 1;
                setOnlineStatus(`p${id}_online`, p.on);
                setFluxo(`p${id}_fluxo`, p.fl, `p${id}_motor`);
                
                // Timer em Minutos
                const minUso = (p.tot / 60).toFixed(1);
                setText(`p${id}_timer`, minUso + " min");

                // Elétrica (Cálculo baseado no JSON)
                const consumoKwh = (p.tot / 3600) * (p.kw || 1.5);
                const custoRs = consumoKwh * (d.cfg_tar || 0.85);
                
                setText(`p${id}_kwh`, consumoKwh.toFixed(2) + " kWh");
                setText(`p${id}_custo`, "R$ " + custoRs.toFixed(2));

                // Histórico (Fiel ao formato solicitado)
                const li = document.createElement("li");
                li.style.padding = "10px";
                li.style.borderBottom = "1px solid #eee";
                li.innerHTML = `<strong>Poço 0${id}</strong>: Acumulado ${minUso} min de uso`;
                listH.appendChild(li);
            });

            // Sincroniza abas de configuração (uma vez)
            if (!carregados.configs) {
                document.getElementById("cfg_rodizio_h").value = Math.floor(d.cfg_rod / 60);
                document.getElementById("cfg_rodizio_m").value = d.cfg_rod % 60;
                document.getElementById("cfg_retroA").value = d.cfg_ra;
                document.getElementById("cfg_retroB").value = d.cfg_rb;
                document.getElementById("cfg_manual_poco").value = d.cfg_m;
                if(document.getElementById("cfg_tarifa")) document.getElementById("cfg_tarifa").value = d.cfg_tar;
                carregados.configs = true;
            }

        } catch (e) { console.error("Erro no JSON:", e); }
    }
}

function initMQTT() {
    client = new Paho.MQTT.Client(host, port, "/mqtt", "FenixWeb_" + Math.random().toString(16).slice(2,8));
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

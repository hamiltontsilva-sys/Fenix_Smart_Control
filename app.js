// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com"; //
const port = 8084; //
const path = "/mqtt"; //
const username = "Admin"; //
const password = "Admin"; //

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
}; //

if (typeof firebase !== 'undefined') { firebase.initializeApp(firebaseConfig); }

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt; //
}

function setOnlineStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOnline = (state == 1 || state == "1");
    el.textContent = isOnline ? "ONLINE" : "OFFLINE"; //
    el.style.color = isOnline ? "#27ae60" : "#e74c3c";
}

function setFluxo(id, val, motorId) {
    const el = document.getElementById(id);
    const motor = document.getElementById(motorId);
    if (el) el.textContent = (val == 1 || val == "1") ? "COM FLUXO" : "SEM FLUXO"; //
    if (motor) {
        (val == 1 || val == "1") ? motor.classList.add("spinning") : motor.classList.remove("spinning"); //
    }
}

// ==========================================================
// PROCESSAMENTO DO JSON UNIFICADO
// ==========================================================
function onMessage(msg) {
    if (msg.destinationName === "smart_level/central/status_geral") {
        try {
            const d = JSON.parse(msg.payloadString); //

            // 1. DASHBOARD PRINCIPAL
            setText("sistema", d.ligado == 1 ? "LIGADO" : "DESLIGADO"); //
            setText("retrolavagem", d.retro == 1 ? "RETROLAVAGEM" : "CTRL. NÍVEL"); //
            setText("manual", d.manu == 1 ? "MANUAL" : "AUTO"); //
            setText("rodizio_min", d.cfg_rod + " min"); 
            setText("poco_ativo", "Poço " + d.ativo); //
            setText("retroA_status", "Poço " + d.cfg_ra);
            setText("retroB_status", "Poço " + d.cfg_rb);
            setText("poco_manual_sel", "P" + d.cfg_m);
            setText("cloro_peso", d.cloro_kg + " kg"); //

            // 2. PROCESSAMENTO DOS POÇOS E HISTÓRICO
            const listaH = document.getElementById("history_list");
            if (listaH) listaH.innerHTML = ""; 

            d.pocos.forEach((p, i) => {
                const id = i + 1;
                setOnlineStatus(`p${id}_online`, p.on); //
                setFluxo(`p${id}_fluxo`, p.fl, `p${id}_motor`); //
                
                // Timer em Minutos
                const minutosUso = (p.tot / 60).toFixed(1);
                setText(`p${id}_timer`, minutosUso + " min"); //

                // Cálculo de Consumo (kWh e R$)
                const horasUso = p.tot / 3600;
                const consumoKwh = horasUso * (p.kw || 1.5);
                const custoReal = consumoKwh * (d.cfg_tar || 0.85);

                setText(`p${id}_kwh`, consumoKwh.toFixed(2) + " kWh");
                setText(`p${id}_custo`, "R$ " + custoReal.toFixed(2));

                // Adiciona Acumulados ao Histórico
                if (listaH) {
                    const liAcum = document.createElement("li");
                    liAcum.className = "history-item";
                    liAcum.style.padding = "10px";
                    liAcum.style.borderBottom = "1px solid #eee";
                    liAcum.style.background = "#f9f9f9";
                    liAcum.innerHTML = `<strong>POÇO 0${id}</strong>: Acumulado ${minutosUso} min`;
                    listaH.appendChild(liAcum);
                }
            });

            // 3. ADICIONA EVENTOS DE RETRO AO HISTÓRICO
            if (listaH && d.retro_history) {
                d.retro_history.forEach(item => {
                    const liRetro = document.createElement("li");
                    liRetro.className = "history-item";
                    liRetro.style.padding = "10px";
                    liRetro.style.borderBottom = "1px solid #eee";
                    liRetro.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
                    listaH.appendChild(liRetro);
                });
            }

            // Sincroniza Configurações (Apenas na primeira carga)
            if (!carregados.configs) {
                document.getElementById("cfg_rodizio_h").value = Math.floor(d.cfg_rod / 60);
                document.getElementById("cfg_rodizio_m").value = d.cfg_rod % 60;
                document.getElementById("cfg_retroA").value = d.cfg_ra;
                document.getElementById("cfg_retroB").value = d.cfg_rb;
                document.getElementById("cfg_manual_poco").value = d.cfg_m;
                
                if(document.getElementById("cfg_tarifa")) document.getElementById("cfg_tarifa").value = d.cfg_tar;
                carregados.configs = true;
            }

        } catch (e) { console.error("Erro no processamento:", e); }
    }
}

// ==========================================================
// CONEXÃO MQTT E COMANDOS
// ==========================================================
function initMQTT() {
    const clientId = "Fenix_App_" + Math.random().toString(16).slice(2, 8);
    client = new Paho.MQTT.Client(host, port, path, clientId); //
    client.onMessageArrived = onMessage; //
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Reconectando...");
        setTimeout(initMQTT, 5000);
    };
    
    client.connect({
        useSSL: true, userName: username, password: password, //
        onSuccess: () => {
            setText("mqtt_status", "MQTT: Conectado");
            client.subscribe("smart_level/central/status_geral"); //
        },
        onFailure: () => setTimeout(initMQTT, 5000)
    });
}

// Comandos
document.getElementById("btnToggle").onclick = () => {
    const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true })); //
    msg.destinationName = "smart_level/central/cmd"; //
    client.send(msg);
};

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
    msg.destinationName = "smart_level/central/cmd"; //
    client.send(msg);
    alert("Configurações enviadas!");
};

document.getElementById("btnSalvarEletrico").onclick = () => {
    const eletrico = {
        cfg_tar: parseFloat(document.getElementById("cfg_tarifa").value),
        p1_kw: parseFloat(document.getElementById("p1_pot").value),
        p2_kw: parseFloat(document.getElementById("p2_pot").value),
        p3_kw: parseFloat(document.getElementById("p3_pot").value)
    };
    const msg = new Paho.MQTT.Message(JSON.stringify(eletrico));
    msg.destinationName = "smart_level/central/cmd"; //
    client.send(msg);
    alert("Dados elétricos guardados!");
};

initMQTT(); //

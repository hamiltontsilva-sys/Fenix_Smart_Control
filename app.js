// CONFIGURAÇÃO MQTT ORIGINAL
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();

// FUNÇÕES DE INTERFACE ORIGINAIS
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";
}

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Lógica Original de Status
    if (topic === "smart_level/central/sistema") {
        setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
    }

    switch (topic) {
        case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p2_online": setText("p2_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p3_online": setText("p3_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p1_fluxo": setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p2_fluxo": setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/p3_fluxo": setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO"); break;
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
        // ... RESTANTE DOS CASES IGUAIS AO ORIGINAL ...
    }
}

// FUNÇÃO HISTÓRICO AJUSTADA (30 ITENS COM SCROLL)
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px"; li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro histórico:", e); }
}

// BOTÃO DE TARA (ÚNICA ADIÇÃO NO JS)
const btnResetTara = document.getElementById("btnResetTara");
if (btnResetTara) {
    btnResetTara.addEventListener("click", () => {
        if (!client || !confirm("Deseja zerar a balança remota?")) return;
        const msg = new Paho.MQTT.Message(JSON.stringify({ reset_tara: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    });
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => { client.subscribe("smart_level/central/#"); }
    });
}
initMQTT();

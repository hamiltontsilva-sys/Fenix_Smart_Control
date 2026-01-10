// ==========================================================
// CONFIGURAÇÃO MQTT
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;

// ==========================================================
// PROCESSAMENTO DE MENSAGENS (MQTT -> APP)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // 1. Processa Telemetria JSON (Consumo, Custo e Horas)
    if (topic.startsWith("smart_level/telemetry/p")) {
        try {
            const data = JSON.parse(val);
            const pId = topic.split('/').pop(); // Extrai p1, p2 ou p3
            
            setText(`${pId}_hrtp`, data.hrtp.toFixed(2) + " h");   // Horas Totais
            setText(`${pId}_hrpp`, data.hrpp.toFixed(2) + " h");   // Horas Parciais
            setText(`${pId}_kwhp`, data.kwhp.toFixed(2) + " kWh"); // Consumo
            setText(`${pId}_vkwh`, "R$ " + data.vkwh.toFixed(2));  // Valor em R$
            setText(`${pId}_datarp`, "Reset: " + data.datarp);     // Data do Reset
        } catch (e) { console.error("Erro no JSON:", e); }
        return;
    }

    // 2. Processa Status da Central (Com Trava de Foco para não pular)
    switch (topic) {
        case "smart_level/central/sistema": 
            updatePowerButton(val); 
            break;
        case "smart_level/central/rodizio_min": 
            const totMin = parseInt(val);
            const elH = document.getElementById("cfg_rodizio_h");
            const elM = document.getElementById("cfg_rodizio_m");
            if (elH && document.activeElement !== elH) elH.value = Math.floor(totMin / 60);
            if (elM && document.activeElement !== elM) elM.value = totMin % 60;
            break;
        case "smart_level/central/manual_poco": 
            const elMan = document.getElementById("cfg_manual_poco");
            if (elMan && document.activeElement !== elMan) elMan.value = val;
            break;
        case "smart_level/central/retroA_status": 
            const elA = document.getElementById("cfg_retroA");
            if (elA && document.activeElement !== elA) elA.value = val;
            break;
        case "smart_level/central/retroB_status": 
            const elB = document.getElementById("cfg_retroB");
            if (elB && document.activeElement !== elB) elB.value = val;
            break;
        case "smart_level/central/cloro_peso_kg": 
            setText("cloro_peso", val + " kg"); 
            break;
    }
}

// ==========================================================
// ENVIO DE CONFIGURAÇÕES (APP -> CENTRAL)
// ==========================================================
document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    if (!client || !client.isConnected()) return;

    const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
    const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
    
    // Alinhado exatamente com o que a sua central espera
    const config = {
        "rodizio": (h * 60) + m,
        "retroA": parseInt(document.getElementById("cfg_retroA").value),
        "retroB": parseInt(document.getElementById("cfg_retroB").value),
        "manual_poco": document.getElementById("cfg_manual_poco").value,
        "PKW_P1": parseFloat(document.getElementById("cfg_pot1").value) || 1.5,
        "PKW_P2": parseFloat(document.getElementById("cfg_pot2").value) || 1.5,
        "PKW_P3": parseFloat(document.getElementById("cfg_pot3").value) || 5.5,
        "PRECO_KW": parseFloat(document.getElementById("cfg_pkwh").value) || 0.85
    };
    
    const msg = new Paho.MQTT.Message(JSON.stringify(config));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
    alert("Configurações enviadas!");
});

// ==========================================================
// FUNÇÕES AUXILIARES E INICIALIZAÇÃO
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updatePowerButton(state) {
    const btn = document.getElementById("btnToggle");
    if (!btn) return;
    btn.textContent = (state === "1") ? "SISTEMA: ON" : "SISTEMA: OFF";
    btn.className = (state === "1") ? "btn-on" : "btn-off";
}

function initMQTT() {
    client = new Paho.MQTT.Client(host, port, "/mqtt", "Fenix_Web_" + Math.random());
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => { 
            client.subscribe("smart_level/central/#"); 
            client.subscribe("smart_level/telemetry/#"); 
        }
    });
}

initMQTT();

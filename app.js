/************************************************************
 *  FÊNIX SMART CONTROL - APP.JS
 *  • Histórico de Retrolavagem (10 últimas)
 *  • Enviar Configuração
 *  • Ler Configuração Atual
 *  • 2 clientes (máx 10 tópicos cada)
 *  • Correção do nível
 ************************************************************/

let clientA = null;
let clientB = null;

// =============================
//  HISTÓRICO
// =============================
let retroHistory = [];
let retroStart = null;

function addRetroLog(text) {
    const box = document.getElementById("consoleBox");
    retroHistory.push(text);
    if (retroHistory.length > 10) retroHistory.shift();
    if (box) box.value = retroHistory.join("\n");
}

// =============================
//  CONEXÃO MQTT
// =============================
function connectMQTT() {

    const url = document.getElementById("brokerUrl").value;
    const user = document.getElementById("mqttUser").value;
    const pass = document.getElementById("mqttPass").value;

    if (!url) {
        console.error("Broker não informado!");
        return;
    }

    // -------- CLIENTE A (CENTRAL) --------
    clientA = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // -------- CLIENTE B (POÇOS) ----------
    clientB = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // ------------------------------
    // CLIENTE A CONECTOU
    // ------------------------------
    clientA.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ao Servidor";

        clientA.subscribe("central/sistema");
        clientA.subscribe("central/nivel");
        clientA.subscribe("central/poco_ativo");
        clientA.subscribe("central/retrolavagem");
        clientA.subscribe("central/retropocos");
        clientA.subscribe("central/p1_online");
        clientA.subscribe("central/p2_online");
        clientA.subscribe("central/p3_online");

        // LER CONFIG DO ESP
        clientA.subscribe("central/config_atual");
    });

    // ------------------------------
    // CLIENTE B CONECTOU
    // ------------------------------
    clientB.on("connect", () => {
        clientB.subscribe("pocos/fluxo1");
        clientB.subscribe("pocos/fluxo2");
        clientB.subscribe("pocos/fluxo3");
    });

    // ------------------------------
    // PROCESSAR MENSAGENS A
    // ------------------------------
    clientA.on("message", (topic, msg) => {
        const value = msg.toString();
        console.log("A →", topic, value);

        switch (topic) {

            case "central/sistema":
                document.getElementById("sistema").innerText =
                    value === "1" ? "Ligado" : "Desligado";
                break;

            case "central/nivel":
                // corrigido
                document.getElementById("nivel").innerText =
                    value === "1" ? "Enchendo" : "Cheio";
                break;

            case "central/poco_ativo":
                document.getElementById("pocoAtivo").innerText = value;
                break;

            case "central/retropocos":
                document.getElementById("retropocos").innerText = value;
                break;

            case "central/retrolavagem":
                processarRetrolavagem(value);
                document.getElementById("retro").innerText =
                    value === "1" ? "Ligada" : "Desligada";
                break;

            // ONLINE
            case "central/p1_online":
                document.getElementById("p1_online").innerText =
                    value === "1" ? "Online" : "OFF-line";
                break;

            case "central/p2_online":
                document.getElementById("p2_online").innerText =
                    value === "1" ? "Online" : "OFF-line";
                break;

            case "central/p3_online":
                document.getElementById("p3_online").innerText =
                    value === "1" ? "Online" : "OFF-line";
                break;

            // RECEBE CONFIGURAÇÃO ATUAL
            case "central/config_atual":
                preencherConfiguracao(value);
                break;
        }
    });

    // ------------------------------
    // PROCESSAR MENSAGENS B
    // ------------------------------
    clientB.on("message", (topic, msg) => {
        const value = msg.toString();
        console.log("B →", topic, value);

        switch (topic) {
            case "pocos/fluxo1":
                document.getElementById("fluxo1").innerText =
                    value === "1" ? "Presente" : "Ausente";
                break;

            case "pocos/fluxo2":
                document.getElementById("fluxo2").innerText =
                    value === "1" ? "Presente" : "Ausente";
                break;

            case "pocos/fluxo3":
                document.getElementById("fluxo3").innerText =
                    value === "1" ? "Presente" : "Ausente";
                break;
        }
    });
}

// ========================================
//   PROCESSAR RETROLAVAGEM
// ========================================
function processarRetrolavagem(value) {

    if (value === "1") {
        retroStart = new Date();
        const data = retroStart.toLocaleDateString("pt-BR");
        const hora = retroStart.toLocaleTimeString("pt-BR");
        addRetroLog(`[${data}] Retro iniciada às ${hora}`);
    }

    if (value === "0" && retroStart) {
        const end = new Date();
        const data = end.toLocaleDateString("pt-BR");
        const horaInicio = retroStart.toLocaleTimeString("pt-BR");
        const horaFim = end.toLocaleTimeString("pt-BR");
        addRetroLog(`[${data}] Retro iniciada às ${horaInicio} Finalizada às ${horaFim}`);
        retroStart = null;
    }
}

// ========================================
//   ENVIAR CONFIGURAÇÃO
// ========================================
function enviarConfiguracao() {

    if (!clientA || !clientA.publish) {
        console.error("MQTT não conectado");
        return;
    }

    const payload = JSON.stringify({
        retroA: document.getElementById("retroA").value,
        retroB: document.getElementById("retroB").value,
        horas: document.getElementById("horas").value,
        timeout: document.getElementById("timeout").value,
        manual: document.getElementById("manual").value
    });

    console.log("CONFIG ENVIADA:", payload);

    clientA.publish("central/config", payload);
    addRetroLog(`[${new Date().toLocaleDateString("pt-BR")}] Config enviada`);
}

// ========================================
//   RECEBER CONFIG DO ESP E PREENCHER
// ========================================
function preencherConfiguracao(jsonStr) {
    try {
        const cfg = JSON.parse(jsonStr);

        document.getElementById("retroA").value = cfg.retroA;
        document.getElementById("retroB").value = cfg.retroB;
        document.getElementById("horas").value = cfg.horas;
        document.getElementById("timeout").value = cfg.timeout;
        document.getElementById("manual").value = cfg.manual;

        addRetroLog(`[${new Date().toLocaleDateString("pt-BR")}] Config carregada`);
    } catch (e) {
        console.error("Erro ao interpretar config:", e);
    }
}

// ========================================
//   BOTÃO DE ENVIO
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnEnviarConfig")
        ?.addEventListener("click", enviarConfiguracao);
});

// ========================================
//   AUTO START
// ========================================
window.onload = () => connectMQTT();

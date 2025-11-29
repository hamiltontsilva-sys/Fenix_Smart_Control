/************************************************************
 *  FÊNIX SMART CONTROL - APP.JS COMPLETO E REVISADO
 *  • Histórico de Retrolavagem (10 últimas)
 *  • Enviar configurações
 *  • Ler configurações atuais
 *  • Correção do Nível (Cheio / Enchendo)
 *  • Mantém 2 clientes MQTT (≤10 tópicos cada)
 ************************************************************/

let clientA = null;   // CENTRAL
let clientB = null;   // POÇOS

// -----------------------------------------------
//  HISTÓRICO DE RETROLAVAGEM
// -----------------------------------------------
let retroHistory = [];  
let retroStart = null; 

function addRetroLog(text) {
    const box = document.getElementById("consoleBox");
    if (!box) return;

    retroHistory.push(text);
    if (retroHistory.length > 10) retroHistory.shift();

    box.value = retroHistory.join("\n");
}

// -----------------------------------------------
//  CONEXÃO MQTT
// -----------------------------------------------
function connectMQTT() {

    const url = "wss://y1184ab7.ala.us-east-1.emqxsl.com:8084/mqtt";
    const user = "Admin";
    const pass = "Admin";

    // CLIENTE A - CENTRAL (máx. 10 tópicos)
    clientA = mqtt.connect(url, {
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 2000
    });

    // CLIENTE B - POÇOS (máx. 10 tópicos)
    clientB = mqtt.connect(url, {
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 2000
    });

    clientA.on("connect", () => {
        document.getElementById("status").innerText = "Conectado ✓";
        subscribeCentral();
    });

    clientB.on("connect", () => {
        subscribePocos();
    });

    clientA.on("message", onMessageReceived);
    clientB.on("message", onMessageReceived);

    clientA.on("close", () => {
        document.getElementById("status").innerText = "Desconectado";
    });
}

// -----------------------------------------------
//  ASSINATURAS - CLIENTE A (CENTRAL)
// -----------------------------------------------
function subscribeCentral() {
    [
        "central/sistema",
        "central/nivel",
        "central/poco_ativo",
        "central/retrolavagem",
        "central/retropocos",
        "central/config_atual"     // ← configuração lida do ESP
    ].forEach(t => clientA.subscribe(t));
}

// -----------------------------------------------
//  ASSINATURAS - CLIENTE B (POÇOS)
// -----------------------------------------------
function subscribePocos() {
    [
        "central/p1_online",
        "central/p2_online",
        "central/p3_online",
        "pocos/fluxo1",
        "pocos/fluxo2",
        "pocos/fluxo3"
    ].forEach(t => clientB.subscribe(t));
}

// --------------------------------------------------
//  RECEBIMENTO DE MENSAGENS
// --------------------------------------------------
function onMessageReceived(topic, msg) {
    const value = msg.toString();
    console.log(topic + " => " + value);

    updateUI(topic, value);

    // ----------- Histórico de Retrolavagem ------------
    if (topic === "central/retrolavagem") {

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

    // ----------- Receber configuração atual do ESP ------------
    if (topic === "central/config_atual") {
        try {
            const cfg = JSON.parse(value);

            document.getElementById("retroA").value = cfg.retroA;
            document.getElementById("retroB").value = cfg.retroB;
            document.getElementById("horas").value = cfg.horas;
            document.getElementById("timeout").value = cfg.timeout;
            document.getElementById("manual").value = cfg.manual;

            addRetroLog(`[${new Date().toLocaleDateString("pt-BR")}] Configuração carregada`);
        } catch (e) {
            console.error("Erro na config_atual:", e);
        }
    }
}

// --------------------------------------------------
//  ATUALIZAÇÃO DA INTERFACE
// --------------------------------------------------
function updateUI(topic, value) {

    switch (topic) {

        case "central/sistema":
            document.getElementById("sistema").innerText =
                value === "1" ? "Ligado" : "Desligado";
            break;

        case "central/nivel":
            // CORRIGIDO — antes estava invertido
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
            document.getElementById("retro").innerText =
                value === "1" ? "Ligada" : "Desligada";
            break;

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
}

// --------------------------------------------------
//  ENVIAR CONFIGURAÇÃO
// --------------------------------------------------
function enviarConfiguracao() {

    if (!clientA || !clientA.publish) {
        console.error("MQTT não conectado!");
        return;
    }

    const payload = JSON.stringify({
        retroA: document.getElementById("retroA").value,
        retroB: document.getElementById("retroB").value,
        horas: document.getElementById("horas").value,
        timeout: document.getElementById("timeout").value,
        manual: document.getElementById("manual").value
    });

    clientA.publish("central/config", payload);

    addRetroLog(`[${new Date().toLocaleDateString("pt-BR")}] Configuração enviada`);
    console.log("Config enviada:", payload);
}

// --------------------------------------------------
//  BOTÃO DE ENVIAR CONFIG
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById("btnEnviarConfig");
    if (botao) botao.addEventListener("click", enviarConfiguracao);
});

// --------------------------------------------------
//  INICIAR AUTOMATICAMENTE
// --------------------------------------------------
window.onload = function () {
    connectMQTT();
};

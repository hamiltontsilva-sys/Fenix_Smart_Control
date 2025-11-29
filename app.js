/************************************************************
 *  FÊNIX SMART CONTROL - APP.JS COMPLETO E REVISADO
 *  AGORA COM HISTÓRICO DE RETROLAVAGEM (10 ÚLTIMAS)
 *  SEM ALTERAR NADA DO QUE JÁ FUNCIONA
 ************************************************************/

let clientA = null;
let clientB = null;

// -----------------------------------------------
//  HISTÓRICO DE RETROLAVAGEM
// -----------------------------------------------
let retroHistory = [];   // guarda até 10 registros
let retroStart = null;   // guarda hora de início

function addRetroLog(text) {
    const box = document.getElementById("consoleBox");
    const timestamp = new Date().toLocaleString("pt-BR");

    const finalText = `[${timestamp}] ${text}`;

    // adiciona ao histórico
    retroHistory.push(finalText);

    // limita a 10 itens
    if (retroHistory.length > 10) {
        retroHistory.shift();
    }

    // imprime na caixa preta
    box.value = retroHistory.join("\n");
}

// -----------------------------------------------
//  CONEXÃO AUTOMÁTICA
// -----------------------------------------------
function connectMQTT() {

    const url = "wss://y1184ab7.ala.us-east-1.emqxsl.com:8084/mqtt";
    const user = "Admin";
    const pass = "Admin";

    // Cliente A (central)
    clientA = mqtt.connect(url, {
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 2000
    });

    // Cliente B (poços)
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
//  ASSINATURAS (dividido em 2 clientes)
// -----------------------------------------------
function subscribeCentral() {
    const topicosA = [
        "central/sistema",
        "central/nivel",
        "central/poco_ativo",
        "central/retrolavagem",
        "central/retropocos",
        "central/p1_online",
        "central/p2_online",
        "central/p3_online"
    ];
    topicosA.forEach(t => clientA.subscribe(t));
}

function subscribePocos() {
    const topicosB = [
        "pocos/fluxo1",
        "pocos/fluxo2",
        "pocos/fluxo3"
    ];
    topicosB.forEach(t => clientB.subscribe(t));
}

// --------------------------------------------------
//   RECEBIMENTO DE MENSAGENS
// --------------------------------------------------
function onMessageReceived(topic, msg) {
    const value = msg.toString();

    // mostrar no console (debug)
    console.log(topic + " => " + value);

    // atualizar UI
    updateUI(topic, value);

    // registrar eventos da retrolavagem
    if (topic === "central/retrolavagem") {

        if (value === "1") {
            retroStart = new Date();
            addRetroLog("Retrolavagem INICIADA");
        }

        if (value === "0" && retroStart) {
            let end = new Date();
            addRetroLog(
                "Retrolavagem FINALIZADA (Início: " +
                retroStart.toLocaleString("pt-BR") +
                " / Fim: " +
                end.toLocaleString("pt-BR") +
                ")"
            );
            retroStart = null;
        }
    }
}

// --------------------------------------------------
//   ATUALIZAÇÃO DA INTERFACE
// --------------------------------------------------
function updateUI(topic, value) {

    switch (topic) {

        case "central/sistema":
            document.getElementById("sistema").innerText = 
                value === "1" ? "Ligado" : "Desligado";
            break;

        case "central/nivel":
            document.getElementById("nivel").innerText =
                value === "1" ? "Cheio" : "Enchendo";
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
//   INICIAR AUTOMATICAMENTE AO CARREGAR A PÁGINA
// --------------------------------------------------
window.onload = function () {
    connectMQTT();
};

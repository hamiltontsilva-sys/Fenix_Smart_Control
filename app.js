/************************************************************
 *  FÊNIX SMART CONTROL - APP.JS COMPLETO
 *  HISTÓRICO DE RETROLAVAGEM (10 ÚLTIMAS)
 ************************************************************/

let clientA = null;
let clientB = null;

// -----------------------------------------------
//  HISTÓRICO DE RETROLAVAGEM
// -----------------------------------------------
let retroHistory = [];   // guarda até 10 registros
let retroStart = null;   // guarda hora de início

function addRetroLog(text) {
    // proteção caso o elemento ainda não exista (evita quebra)
    const box = document.getElementById("consoleBox");
    const finalText = text;

    // adiciona ao histórico
    retroHistory.push(finalText);

    // limita a 10 itens
    if (retroHistory.length > 10) {
        retroHistory.shift();
    }

    // imprime na caixa preta (se existir)
    if (box) {
        box.value = retroHistory.join("\n");
    } else {
        // fallback: log no console (útil para debug)
        console.warn("consoleBox não encontrado. Log:", finalText);
    }
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
        const el = document.getElementById("status");
        if (el) el.innerText = "Conectado ✓";
        subscribeCentral();
    });

    clientB.on("connect", () => {
        subscribePocos();
    });

    clientA.on("message", onMessageReceived);
    clientB.on("message", onMessageReceived);

    clientA.on("close", () => {
        const el = document.getElementById("status");
        if (el) el.innerText = "Desconectado";
    });

    clientA.on("error", (err) => {
        console.error("MQTT ClientA error:", err);
    });

    clientB.on("error", (err) => {
        console.error("MQTT ClientB error:", err);
    });
}

// -----------------------------------------------
//  ASSINATURAS (2 clientes MQTT)
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
    topicosA.forEach(t => {
        if (clientA && clientA.subscribe) clientA.subscribe(t);
    });
}

function subscribePocos() {
    const topicosB = [
        "pocos/fluxo1",
        "pocos/fluxo2",
        "pocos/fluxo3"
    ];
    topicosB.forEach(t => {
        if (clientB && clientB.subscribe) clientB.subscribe(t);
    });
}

// --------------------------------------------------
//   RECEBIMENTO DE MENSAGENS
// --------------------------------------------------
function onMessageReceived(topic, msg) {
    const value = msg.toString();

    // Debug no console do navegador
    console.log(topic + " => " + value);

    // Atualizar interface
    updateUI(topic, value);

    // Registrar eventos da retrolavagem com formatação estilizada
    if (topic === "central/retrolavagem") {

        if (value === "1") {

            retroStart = new Date();

            const data = retroStart.toLocaleDateString("pt-BR");
            const horaInicio = retroStart.toLocaleTimeString("pt-BR");

            addRetroLog(`[${data}] Retro iniciada às ${horaInicio}`);
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
}

// --------------------------------------------------
//   ATUALIZAÇÃO DA INTERFACE
// --------------------------------------------------
function updateUI(topic, value) {

    switch (topic) {

        case "central/sistema":
            {
                const el = document.getElementById("sistema");
                if (el) el.innerText = value === "1" ? "Ligado" : "Desligado";
            }
            break;

        case "central/nivel":
            {
                const el = document.getElementById("nivel");
                if (el) el.innerText = value === "1" ? "Cheio" : "Enchendo";
            }
            break;

        case "central/poco_ativo":
            {
                const el = document.getElementById("pocoAtivo");
                if (el) el.innerText = value;
            }
            break;

        case "central/retropocos":
            {
                const el = document.getElementById("retropocos");
                if (el) el.innerText = value;
            }
            break;

        case "central/retrolavagem":
            {
                const el = document.getElementById("retro");
                if (el) el.innerText = value === "1" ? "Ligada" : "Desligada";
            }
            break;

        case "central/p1_online":
            {
                const el = document.getElementById("p1_online");
                if (el) el.innerText = value === "1" ? "Online" : "OFF-line";
            }
            break;

        case "central/p2_online":
            {
                const el = document.getElementById("p2_online");
                if (el) el.innerText = value === "1" ? "Online" : "OFF-line";
            }
            break;

        case "central/p3_online":
            {
                const el = document.getElementById("p3_online");
                if (el) el.innerText = value === "1" ? "Online" : "OFF-line";
            }
            break;

        case "pocos/fluxo1":
            {
                const el = document.getElementById("fluxo1");
                if (el) el.innerText = value === "1" ? "Presente" : "Ausente";
            }
            break;

        case "pocos/fluxo2":
            {
                const el = document.getElementById("fluxo2");
                if (el) el.innerText = value === "1" ? "Presente" : "Ausente";
            }
            break;

        case "pocos/fluxo3":
            {
                const el = document.getElementById("fluxo3");
                if (el) el.innerText = value === "1" ? "Presente" : "Ausente";
            }
            break;
    }
}

// --------------------------------------------------
//   INICIAR AUTOMATICAMENTE
// --------------------------------------------------
window.onload = function () {
    connectMQTT();
};

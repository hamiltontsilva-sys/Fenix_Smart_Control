/************************************************************
 *  FÊNIX SMART CONTROL - APP.JS FINAL REVISADO
 * 
 *  ● Conexão MQTT automática
 *  ● 2 clientes (limite de 10 tópicos)
 *  ● Histórico 10 últimas retrolavagens
 *  ● Enviar configuração para tópicos corretos
 *  ● Receber configuração atual do ESP
 *  ● Atualização da interface
 ************************************************************/

let clientA = null;   // CENTRAL
let clientB = null;   // POÇOS

// ===========================================================
//  HISTÓRICO DE RETROLAVAGEM
// ===========================================================
let retroHistory = [];
let retroStart = null;

function addRetroLog(text) {
    const box = document.getElementById("consoleBox");
    retroHistory.push(text);
    if (retroHistory.length > 10) retroHistory.shift();
    if (box) box.value = retroHistory.join("\n");
}

// ===========================================================
//   MQTT - CONEXÃO AUTOMÁTICA
// ===========================================================
function connectMQTT() {

    const url = "wss://y1184ab7.ala.us-east-1.emqxsl.com:8084/mqtt";
    const user = "Admin";
    const pass = "Admin";

    // CLIENTE A - CENTRAL
    clientA = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // CLIENTE B - POÇOS
    clientB = mqtt.connect(url, {
        username: user,
        password: pass,
        reconnectPeriod: 2000
    });

    // ----------------------------------------
    //   CLIENTE A CONECTOU
    // ----------------------------------------
    clientA.on("connect", () => {

        document.getElementById("status").innerText = "Conectado ✓";

        // STATUS DO SISTEMA
        clientA.subscribe("central/sistema");
        clientA.subscribe("central/nivel");
        clientA.subscribe("central/poco_ativo");
        clientA.subscribe("central/retrolavagem");
        clientA.subscribe("central/retropocos");
        clientA.subscribe("central/retropocos_status");

        // POÇOS ONLINE
        clientA.subscribe("central/p1_online");
        clientA.subscribe("central/p2_online");
        clientA.subscribe("central/p3_online");

        // CONFIGURAÇÃO ATUAL DO ESP
        clientA.subscribe("central/horas_status");
        clientA.subscribe("central/timeout_status");
        clientA.subscribe("central/manual_mode");
        clientA.subscribe("central/manual_poco");
    });

    // ----------------------------------------
    //   CLIENTE B CONECTOU
    // ----------------------------------------
    clientB.on("connect", () => {
        clientB.subscribe("pocos/fluxo1");
        clientB.subscribe("pocos/fluxo2");
        clientB.subscribe("pocos/fluxo3");
    });

    // ----------------------------------------
    //   MENSAGENS CLIENTE A
    // ----------------------------------------
    clientA.on("message", (topic, msg) => {
        const value = msg.toString();
        console.log("A →", topic, value);

        switch (topic) {

            // ===========================
            //   STATUS DO SISTEMA
            // ===========================
            case "central/sistema":
                document.getElementById("sistema").innerText =
                    value === "1" ? "Ligado" : "Desligado";
                break;

            case "central/nivel":
                document.getElementById("nivel").innerText =
                    value === "1" ? "Enchendo" : "Cheio";
                break;

            case "central/poco_ativo":
                document.getElementById("pocoAtivo").innerText = value;
                break;

            // ===========================
            //   RETROLAVAGEM
            // ===========================
            case "central/retrolavagem":
                processarRetrolavagem(value);
                document.getElementById("retro").innerText =
                    value === "1" ? "Ligada" : "Desligada";
                break;

            case "central/retropocos":
                document.getElementById("retropocos").innerText = value;
                break;

            // ===========================
            //   POÇOS ONLINE
            // ===========================
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

            // =================================================
            //   CONFIGURAÇÃO ATUAL DO ESP (STATUS)
            // =================================================
            case "central/horas_status":
                document.getElementById("horas").value = value;
                break;

            case "central/timeout_status":
                document.getElementById("timeout").value = value;
                break;

            case "central/manual_mode":
                document.getElementById("manual").value = value;
                break;

            case "central/manual_poco":
                document.getElementById("manual").value = value;
                break;
        }
    });

    // ----------------------------------------
    //   MENSAGENS CLIENTE B
    // ----------------------------------------
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

// ===========================================================
//   PROCESSAR RETROLAVAGEM
// ===========================================================
function processarRetrolavagem(value) {

    if (value === "1") {
        retroStart = new Date();
        addRetroLog(
            `[${retroStart.toLocaleDateString("pt-BR")}] `
            + `Retro iniciada às ${retroStart.toLocaleTimeString("pt-BR")}`
        );
    }

    if (value === "0" && retroStart) {
        const end = new Date();
        addRetroLog(
            `[${end.toLocaleDateString("pt-BR")}] `
            + `Retro iniciada às ${retroStart.toLocaleTimeString("pt-BR")} `
            + `Finalizada às ${end.toLocaleTimeString("pt-BR")}`
        );
        retroStart = null;
    }
}

// ===========================================================
//   ENVIAR CONFIGURAÇÃO (TÓPICOS CORRETOS DO ESP)
// ===========================================================
function enviarConfiguracao() {

    if (!clientA || !clientA.publish) {
        console.error("MQTT não conectado!");
        return;
    }

    const retroA = document.getElementById("retroA").value;
    const retroB = document.getElementById("retroB").value;
    const horas = document.getElementById("horas").value;
    const timeout = document.getElementById("timeout").value;
    const manual = document.getElementById("manual").value;

    // 🔥 TÓPICOS EXATOS DO ESP:
    clientA.publish("central/retroA", retroA);
    clientA.publish("central/retroB", retroB);
    clientA.publish("central/horas", horas);
    clientA.publish("central/timeout", timeout);

    clientA.publish("central/manual_mode", manual == "0" ? "0" : "1");
    clientA.publish("central/manual_poco", manual);

    addRetroLog(
        `[${new Date().toLocaleDateString("pt-BR")}] Config enviada `
        + `(A:${retroA} B:${retroB} H:${horas} T:${timeout} M:${manual})`
    );
}

// ===========================================================
//   BOTÃO DE ENVIAR CONFIG
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
    const b = document.getElementById("btnEnviarConfig");
    if (b) b.addEventListener("click", enviarConfiguracao);
});

// ===========================================================
//   INICIAR AUTOMATICAMENTE
// ===========================================================
window.onload = () => connectMQTT();

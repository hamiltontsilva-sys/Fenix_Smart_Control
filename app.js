// ==========================================================
// CONFIGURAÇÃO GLOBAL
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let clientA = null;
let clientB = null;
let clientC = null;

let history = [];
let retroHistoryLoaded = false;

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

    el.classList.remove("status-online", "status-offline");

    if (state === "1") {
        el.textContent = "ONLINE";
        el.classList.add("status-online");
    } else {
        el.textContent = "OFFLINE";
        el.classList.add("status-offline");
    }
}

function setFluxo(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("fluxo-presente", "fluxo-ausente");

    if (val === "1") {
        el.textContent = "Presente";
        el.classList.add("fluxo-presente");
    } else {
        el.textContent = "Ausente";
        el.classList.add("fluxo-ausente");
    }
}

// ==========================================================
// FUNÇÃO PARA PUBLICAR COMANDOS — CORRIGIDA
// ==========================================================
function publish(topic, payload) {
    try {
        if (clientA && clientA.isConnected()) {
            const msg = new Paho.MQTT.Message(payload);
            msg.destinationName = topic;
            clientA.send(msg);
            return;
        }

        if (clientB && clientB.isConnected()) {
            const msg = new Paho.MQTT.Message(payload);
            msg.destinationName = topic;
            clientB.send(msg);
            return;
        }

        console.warn("Nenhum cliente MQTT conectado no momento.");
    } catch (e) {
        console.error("Erro ao publicar MQTT:", e);
    }
}

// ==========================================================
// CONTROLES — MANTIDOS
// ==========================================================
function attachUIEvents() {
    const sendBtn = document.getElementById("btnSend");
    const toggleBtn = document.getElementById("btnToggle");

    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            const obj = {
                rodizio: Number(document.getElementById("cfg_rodizio").value),
                retroA: Number(document.getElementById("cfg_retroA").value),
                retroB: Number(document.getElementById("cfg_retroB").value),
                timeout: Number(document.getElementById("cfg_timeout").value),
                manual_poco: Number(document.getElementById("cfg_manual_poco").value)
            };

            publish("smart_level/central/cmd", JSON.stringify(obj));

            const st = document.getElementById("cfg_status");
            if (st) {
                st.textContent = "Configuração enviada!";
                st.classList.add("show");
                setTimeout(() => st.classList.remove("show"), 3000);
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            publish("smart_level/central/cmd", JSON.stringify({ toggle: 1 }));
        });
    }
}

// ==========================================================
// INICIAR CLIENTES MQTT
// (DEIXEI A CHAMADA NO FINAL PARA GARANTIR QUE CARREGUEM)
// ==========================================================
// startClientA();
// startClientB();
// startClientC();


// ==========================================================
// SISTEMA DE ABAS — CORRIGIDO
// (AGORA NÃO SOBRESCREVE O DOMContentLoaded DO MQTT)
// ==========================================================
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    const tablinks = document.getElementsByClassName("tab-button");

    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }

    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}


// ==========================================================
// EVENTO PRINCIPAL — TUDO AQUI DENTRO (CORRIGIDO)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {

    // Inicializa o DASHBOARD como aba padrão
    document.getElementById("dashboard").classList.add("active");

    // Anexa botões
    attachUIEvents();

    // Inicia MQTT CORRETAMENTE
    if (typeof startClientA === "function") startClientA();
    if (typeof startClientB === "function") startClientB();
    if (typeof startClientC === "function") startClientC();
});

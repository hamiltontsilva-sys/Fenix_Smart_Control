// ==========================================================
// CONFIGURAÇÃO GLOBAL (ORIGINAL)
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
// FUNÇÕES DE INTERFACE (ORIGINAL)
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

// ... Outras funções de interface que não foram incluídas no snippet, mas devem ser mantidas no seu arquivo real.

// ==========================================================
// FUNÇÃO PARA ENVIAR COMANDOS (ORIGINAL)
// ==========================================================
function publish(topic, payload) {
    if (clientA && clientA.isConnected()) {
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = topic;
        clientA.send(msg);
    }
}

// ==========================================================
// BOTÕES (ORIGINAL)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    // Listener do botão de CONFIGURAÇÃO
    document.getElementById("btnSend").addEventListener("click", () => {
        const obj = {
            rodizio: Number(document.getElementById("cfg_rodizio").value),
            retroA: Number(document.getElementById("cfg_retroA").value),
            retroB: Number(document.getElementById("cfg_retroB").value),
            timeout: Number(document.getElementById("cfg_timeout").value),
            manual_poco: Number(document.getElementById("cfg_manual_poco").value)
        };

        publish("smart_level/central/cmd", JSON.stringify(obj));

        const st = document.getElementById("cfg_status");
        st.textContent = "Configuração enviada!";
        st.classList.add("show");

        setTimeout(() => {
            st.classList.remove("show");
        }, 4000);
    });

    // Listener do BOTÃO LIGA / DESLIGA
    document.getElementById("btnToggle").addEventListener("click", () => {
        // Envia o comando, o toggle do estado visual é feito pela mensagem de status recebida
        publish("smart_level/central/cmd", JSON.stringify({ toggle: 1 }));
    });
});

// ==========================================================
// INICIAR CLIENTES (ORIGINAL)
// ==========================================================
// Estas funções devem existir no seu app.js completo para iniciar o MQTT
// startClientA();
// startClientB();
// startClientC();

// ==========================================================
// LÓGICA DE ABAS (NOVO CÓDIGO)
// ==========================================================
/**
 * Função para alternar entre as abas.
 * NÃO interfere na lógica MQTT.
 */
function openTab(evt, tabName) {
    // Declara todas as variáveis
    let i, tabcontent, tablinks;

    // Obtém todos os elementos com class="tab-content" e os esconde
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove('active');
    }

    // Obtém todos os elementos com class="tab-button" e remove a classe "active"
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('active');
    }

    // Mostra a aba atual e adiciona a classe "active" no botão que a abriu
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// Inicializa a primeira aba (Dashboard)
document.addEventListener("DOMContentLoaded", () => {
    // Assegura que o Dashboard esteja visível ao carregar a página
    document.getElementById('dashboard').classList.add('active');
});

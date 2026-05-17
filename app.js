function abrirAba(id, btn) {
            document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            lucide.createIcons();
        }

        const nomesPocos = ['Poço Verão', 'Primavera', 'Poço Inverno', 'Poço Laje', 'Poço Novo', 'Poço Master'];
        const grid = document.getElementById('pocosGrid');

        for (let i = 1; i <= 6; i++) {
            const n = String(i).padStart(2, '0');
            grid.innerHTML += `
                <div class="card p-5 border-t-4 border-t-blue-600" id="poco-${n}">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-black text-slate-800 uppercase">Poço ${n}</h3>
                        <span class="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">ID:${n}</span>
                    </div>
                    <div class="space-y-4">
                        <div><label class="label-hmi">Identificação do poço ${n}</label><input class="input-hmi" type="number" min="1" max="6" value="${i}"><span class="tag-hmi">WELL${n}_ID</span></div>
                        <div><label class="label-hmi">Nome poço ${n}</label><input class="input-hmi" type="text" value="${nomesPocos[i - 1]}"><span class="tag-hmi">WELL${n}_NAME</span></div>
                        <div><label class="label-hmi">Potência poço ${n} <span class="unit-hmi">kW</span></label><input class="input-hmi" type="number" value="15"><span class="tag-hmi">WELL${n}_POWER_KW</span></div>
                        <div><label class="label-hmi">Vazão poço ${n} <span class="unit-hmi">m³/h</span></label><input class="input-hmi" type="number" value="25"><span class="tag-hmi">WELL${n}_FLOW</span></div>
                        <div><label class="label-hmi">Poço habilitado</label><select class="input-hmi"><option value="true" selected>Sim</option><option value="false">Não</option></select><span class="tag-hmi">WELL${n}_ENABLED</span></div>
                        <div><label class="label-hmi">Seleção manual</label><select class="input-hmi"><option value="false" selected>Não</option><option value="true">Sim</option></select><span class="tag-hmi">WELL${n}_MANUAL_SELECT</span></div>
                        <div class="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                            <span id="status-poco-${n}" class="save-status">Sem alterações</span>
                            <button class="btn-save" onclick="salvarGrupo('poco-${n}', 'status-poco-${n}', this)"><i data-lucide="save" class="w-4 h-4"></i> Salvar poço ${n}</button>
                        </div>
                    </div>
                </div>
            `;
        }

        function alternarCamposNivelAnalogico() {
            const sensor = document.getElementById('LEVEL_SENSOR_SEL');
            const campoMin = document.getElementById('campo-nivel-min');
            const campoMax = document.getElementById('campo-nivel-max');

            if (!sensor || !campoMin || !campoMax) return;

            if (sensor.value === '1') {
                campoMin.classList.remove('hidden');
                campoMax.classList.remove('hidden');
            } else {
                campoMin.classList.add('hidden');
                campoMax.classList.add('hidden');
            }

            ultimaConfigOperacional.LEVEL_SENSOR_SEL = Number(sensor.value);
            atualizarApresentacaoNivelDashboard(ultimoStatusSistema?.sistema || {});
        }

        function monitorarAlteracoes() {
            document.querySelectorAll('.input-hmi').forEach(campo => {
                campo.dataset.valorOriginal = campo.value;

                const marcarAlterado = () => {
                    campo.classList.remove('saved-ok');

                    if (String(campo.value) !== String(campo.dataset.valorOriginal)) {
                        campo.classList.add('changed');

                        const containerPoco = campo.closest('[id^="poco-"]');
                        if (containerPoco) {
                            const status = containerPoco.querySelector('.save-status');
                            if (status) status.textContent = 'Alteração pendente';
                            return;
                        }

                        const secao = campo.closest('.tab-page');
                        if (secao) {
                            const status = secao.querySelector('.save-status');
                            if (status) status.textContent = 'Alterações pendentes';
                        }
                    } else {
                        campo.classList.remove('changed');
                    }
                };

                campo.addEventListener('input', marcarAlterado);
                campo.addEventListener('change', marcarAlterado);
            });
        }

        function coletarDados(containerId) {
            const container = document.getElementById(containerId);
            const dados = {};

            container.querySelectorAll('.tag-hmi').forEach(tagEl => {
                const tag = tagEl.textContent.trim();
                const campo = tagEl.parentElement.querySelector('.input-hmi');
                if (campo) dados[tag] = campo.value;
            });

            return dados;
        }


        // =========================
        // MQTT - CONFIGURAÇÃO DO APP
        // =========================
        const MAX_REGISTROS_RETRO = 100;
        const MAX_REGISTROS_ALARME = 100;

        const MQTT_URL = 'wss://v05ef722.ala.us-east-1.emqxsl.com:8084/mqtt';
        const MQTT_OPTIONS = {
            username: 'smartlevel_app',
            password: 'SLapp_2026_Fenix_9mK4!vR2',
            clientId: 'APP_HMI_' + Math.random().toString(16).substring(2, 10),
            clean: true,
            reconnectPeriod: 3000,
            connectTimeout: 8000
        };

        const TOPICS = {
            cfgEngSet: 'smart_level/central/config/engenharia/set',
            cfgOperSet: 'smart_level/central/config/operacional/set',
            cfgPocoSet: 'smart_level/central/config/poco/set',
            ack: 'smart_level/central/ack',
            statusJson: 'smart_level/central/status/json',
            radioJson: 'smart_level/central/radio/json',
            configJson: 'smart_level/central/config/json',
            energiaJson: 'smart_level/central/energia/json',
            energiaReset: 'smart_level/central/energia/reset',
            retroHistory: 'smart_level/central/retro/history/json',
            cloroTara: 'smart_level/central/cloro/tara',
            alarmesJson: 'smart_level/central/alarmes/json',
            alarmeEvent: 'smart_level/central/alarme/event',
            cmdSistema: 'smart_level/central/cmd/sistema'
        };

        let mqttClient = null;
        let ultimoEnvio = null;

        let ultimoStatusSistema = null;
        let ultimoStatusRadio = null;
        let ultimaConfigOperacional = {};
        let ultimosAlarmes = [];
        let eventosAlarmes = [];
        let eventosRetro = [];
        let retroAnteriorAtivo = false;
        let retroInicioLocal = null;
        let ultimoStatusCentralMs = 0;
        let centralOnline = false;
        const CENTRAL_TIMEOUT_MS = 7000;

        
        function atualizarEstadoModoPowerV17Seguro(sis) {
            if (!sis) return;

            const estado = document.getElementById('dashSistemaLigado');
            const modo = document.getElementById('dashModoReal');
            const btn = document.getElementById('btnToggleSistemaApp');

            if (estado) estado.textContent = sis.ligado ? 'LIGADO' : 'DESLIGADO';

            if (modo) {
                modo.textContent = (sis.manual_ativo || sis.modo_manual_operacional) ? 'MANUAL' : 'AUTOMÁTICO';
            }

            if (btn) {
                if (!btn.dataset.listenerV17) {
                    btn.dataset.listenerV17 = '1';
                    btn.addEventListener('click', function() {
                        enviarTogglePowerV17Seguro(btn);
                    });
                }
                btn.disabled = false;
                btn.classList.remove('is-offline');
                btn.classList.toggle('is-on', !!sis.ligado);
                btn.classList.toggle('is-off', !sis.ligado);
                btn.title = sis.ligado ? 'Desligar sistema' : 'Ligar sistema';
                btn.setAttribute('aria-label', btn.title);
                btn.innerHTML = sis.ligado
                    ? '<span class="power-icon-ring"><i data-lucide="power" class="w-4 h-4"></i></span><span>Desligar</span>'
                    : '<span class="power-icon-ring"><i data-lucide="power" class="w-4 h-4"></i></span><span>Ligar</span>';
            }

            if (window.lucide) lucide.createIcons();
        }

        function enviarTogglePowerV17Seguro(botao) {
            if (!mqttClient || !mqttClient.connected) {
                alert('MQTT offline');
                return;
            }

            const original = botao ? botao.innerHTML : '';

            if (botao) {
                botao.disabled = true;
                botao.innerHTML = 'Enviando...';
            }

            const payload = { cmd: 'TOGGLE_POWER' };

            mqttClient.publish(TOPICS.cmdSistema, JSON.stringify(payload), { qos: 0, retain: false }, function(err) {
                if (botao) {
                    setTimeout(function() {
                        botao.disabled = false;
                        botao.innerHTML = original || '<i data-lucide="power" class="w-4 h-4"></i> Liga / Desliga';
                        if (window.lucide) lucide.createIcons();
                    }, 800);
                }

                if (err) {
                    console.error('Falha ao enviar comando liga/desliga:', err);
                    alert('Falha ao enviar comando');
                }
            });

            console.log('MQTT TX:', TOPICS.cmdSistema, payload);
        }


function iniciarMQTT() {
            mqttClient = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

            mqttClient.on('connect', () => {
                atualizarStatusMQTT(true);
                mqttClient.subscribe(TOPICS.ack);
                mqttClient.subscribe(TOPICS.statusJson);
                mqttClient.subscribe(TOPICS.radioJson);
                mqttClient.subscribe(TOPICS.configJson);
                mqttClient.subscribe(TOPICS.energiaJson);
                mqttClient.subscribe(TOPICS.retroHistory);
                mqttClient.subscribe(TOPICS.alarmesJson);
                mqttClient.subscribe(TOPICS.alarmeEvent);
                console.log('MQTT conectado');
            });

            mqttClient.on('offline', () => atualizarStatusMQTT(false));
            mqttClient.on('error', err => {
                console.error('MQTT erro:', err);
                atualizarStatusMQTT(false);
            });

            mqttClient.on('message', (topic, payload) => {
                const msg = payload.toString();
                console.log('MQTT RX:', topic, msg);

                let obj;
                try { obj = JSON.parse(msg); } catch(e) { return; }

                if (topic === TOPICS.statusJson || topic === TOPICS.radioJson || topic === TOPICS.energiaJson || topic === TOPICS.alarmesJson) {
                    marcarCentralOnline();
                }

                if (topic === TOPICS.ack) processarAck(obj);
                if (topic === TOPICS.configJson) carregarConfiguracoesNaTela(obj);
                if (topic === TOPICS.statusJson && obj.sistema) { atualizarEstadoModoPowerV17Seguro(obj.sistema); atualizarCardCloracaoDashboard(obj.sistema); atualizarCardCloroBalanca(obj.sistema); }
                if (topic === TOPICS.energiaJson) atualizarTelaEnergiaESP(obj);
                if (topic === TOPICS.retroHistory) atualizarHistoricoRetroESP(obj);
                if (topic === TOPICS.statusJson) atualizarDashboardSistema(obj);
                if (topic === TOPICS.radioJson) atualizarDashboardRadio(obj);
                if (topic === TOPICS.alarmesJson) atualizarTelaAlarmes(obj);
                if (topic === TOPICS.alarmeEvent) processarEventoAlarme(obj);
            });
        }

        function marcarCentralOnline() {
            ultimoStatusCentralMs = Date.now();
            if (!centralOnline) {
                centralOnline = true;
                atualizarStatusCentral(true);
            }
        }

        function iniciarWatchdogCentral() {
            atualizarStatusCentral(false);
            setInterval(() => {
                const expirou = !ultimoStatusCentralMs || (Date.now() - ultimoStatusCentralMs > CENTRAL_TIMEOUT_MS);
                if (expirou && centralOnline) {
                    centralOnline = false;
                    atualizarStatusCentral(false);
                    limparDadosCentralOffline();
                }
            }, 1000);
        }

        function atualizarStatusCentral(online) {
            const box = document.getElementById('centralStatusBox');
            const text = document.getElementById('centralStatusText');
            const dot = document.getElementById('centralStatusDot');
            if (!box || !text || !dot) return;

            if (online) {
                box.className = 'mqtt-pill bg-emerald-50 border border-emerald-100';
                text.className = 'text-[10px] font-black text-emerald-700 flex items-center gap-2 uppercase';
                dot.className = 'w-2 h-2 bg-emerald-500 rounded-full animate-pulse';
                text.lastChild.textContent = ' Central Online';
                setText('dashCentralResumo', 'ONLINE');
            } else {
                box.className = 'mqtt-pill bg-red-50 border border-red-100';
                text.className = 'text-[10px] font-black text-red-700 flex items-center gap-2 uppercase';
                dot.className = 'w-2 h-2 bg-red-500 rounded-full animate-pulse';
                text.lastChild.textContent = ' Central Offline';
                setText('dashCentralResumo', 'OFFLINE');
            }
        }

        function limparDadosCentralOffline() {
            ultimoStatusSistema = null;
            ultimoStatusRadio = null;
            ultimosAlarmes = [];

            ['dashSensorTipo', 'dashModo', 'dashEtapaOperacional', 'dashRetro', 'dashSistemaLigado', 'dashModoReal'].forEach(id => setText(id, '--'));
            setMetricWithUnit('dashVazao', '--', 'm³/h');
            setText('dashNivelPercent', '--%');
            setText('dashNivelEstado', 'Sem dados');
            setText('dashNivelDigitalValor', '--');
            setText('dashNivelDigitalHint', 'Sem leitura da central');
            setText('dashStartSetpoint', '--');
            setText('dashStopSetpoint', '--');
            setText('dashRadioResumo', 'Central offline');
            setText('dashAlarmQtd', '--');
            setText('dashAlarmResumo', 'Central offline');
            setText('status-alarmes', 'Central offline');
            setText('dashKwhTotal', '--');
            setText('dashValorTotal', '--');
            setText('energiaTotalKwh', '--');
            setText('energiaTotalValor', '--');
            setText('energiaValorKwh', '--');
            setText('energia-total-tempo', '--');
            setText('energia-total-kwh', '--');
            setText('energia-total-valor', '--');
            setText('energia-preco-kwh', '--');
            setText('cloroStatusBadge', 'Central offline');

            const barra = document.getElementById('dashNivelBarra');
            if (barra) barra.style.height = '0%';

            const nivelBox = document.getElementById('dashNivelEstadoBox');
            if (nivelBox) nivelBox.className = 'state-box state-neutral';

            const btn = document.getElementById('btnToggleSistemaApp');
            if (btn) {
                btn.disabled = true;
                btn.classList.remove('is-on', 'is-off');
                btn.classList.add('is-offline');
                btn.title = 'Central offline';
                btn.setAttribute('aria-label', 'Central offline');
                btn.innerHTML = '<span class="power-icon-ring"><i data-lucide="power" class="w-4 h-4"></i></span><span>Central offline</span>';
            }

            const gridPocos = document.getElementById('dashboardPocosGrid');
            if (gridPocos) gridPocos.innerHTML = '<div class="card p-5 border border-red-100 bg-red-50 text-red-700 font-black uppercase text-xs">Central offline - dados indisponiveis</div>';

            const listaAlarmes = document.getElementById('alarmesAtivosLista');
            if (listaAlarmes) listaAlarmes.innerHTML = '<div class="card p-5 border border-red-100 bg-red-50 text-red-700 font-black uppercase text-xs">Central offline - alarmes indisponiveis</div>';

            const gridEnergia = document.getElementById('energiaPocosGrid');
            if (gridEnergia) gridEnergia.innerHTML = '<div class="card p-5 border border-red-100 bg-red-50 text-red-700 font-black uppercase text-xs">Central offline - energia indisponivel</div>';

            if (window.lucide) lucide.createIcons();
        }

        function atualizarStatusMQTT(online) {
            const box = document.getElementById('mqttStatusBox');
            const text = document.getElementById('mqttStatusText');
            const dot = document.getElementById('mqttStatusDot');

            if (!box || !text || !dot) return;

            if (online) {
                box.className = 'px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg self-end sm:self-auto';
                text.className = 'text-[10px] font-black text-emerald-700 flex items-center gap-2 uppercase';
                dot.className = 'w-2 h-2 bg-emerald-500 rounded-full animate-pulse';
                text.lastChild.textContent = ' MQTT Online';
            } else {
                box.className = 'px-3 py-1 bg-red-50 border border-red-100 rounded-lg self-end sm:self-auto';
                text.className = 'text-[10px] font-black text-red-700 flex items-center gap-2 uppercase';
                dot.className = 'w-2 h-2 bg-red-500 rounded-full animate-pulse';
                text.lastChild.textContent = ' MQTT Offline';
            }
        }

        function salvarGrupo(containerId, statusId, botao) {
            const dados = converterTipos(coletarDados(containerId));
            const status = document.getElementById(statusId);

            let topic = '';
            let grupo = containerId;

            if (containerId === 'engenharia') {
                topic = TOPICS.cfgEngSet;
                grupo = 'engenharia';
            } else if (containerId === 'configuracao') {
                topic = TOPICS.cfgOperSet;
                grupo = 'operacional';
            } else if (containerId.startsWith('poco-')) {
                topic = TOPICS.cfgPocoSet;
                grupo = containerId;
            } else {
                status.textContent = 'Grupo inválido';
                return;
            }

            if (!mqttClient || !mqttClient.connected) {
                status.textContent = 'MQTT offline';
                return;
            }

            const payload = { grupo, dados };

            status.textContent = 'Enviando para central...';
            botao.disabled = true;
            ultimoEnvio = { containerId, statusId, botao };

            mqttClient.publish(topic, JSON.stringify(payload), { qos: 0, retain: false }, err => {
                if (err) {
                    confirmarSalvo(containerId, statusId, botao, false);
                    status.textContent = 'Falha no envio';
                    ultimoEnvio = null;
                }
            });

            console.log('MQTT TX:', topic, payload);
        }

        
        
        function publicarCloroBalanca(payload) {
            if (!mqttClient || !mqttClient.connected) {
                alert('MQTT offline');
                return false;
            }
            mqttClient.publish(TOPICS.cloroTara, JSON.stringify(payload), { qos: 0, retain: false });
            return true;
        }

        function enviarTaraCloro() {
            if (!confirm('Confirmar tara da balança do cloro?')) return;
            publicarCloroBalanca({ cmd: 'TARA_CLORO' });
        }

function salvarConfigCloroOperador(containerId, statusId, botao) {
            const status = document.getElementById(statusId);
            const peso = Number(document.getElementById('CL_TANK_LOW_KG')?.value || 0);
            const tempoS = Number(document.getElementById('CL_LOW_DELAY_S')?.value || 0);

            if (!mqttClient || !mqttClient.connected) {
                if (status) status.textContent = 'MQTT offline';
                return;
            }

            const payload = {
                CL_TANK_LOW_KG: peso,
                CL_LOW_DELAY_MS: Math.max(0, tempoS) * 1000
            };

            if (status) status.textContent = 'Enviando para central...';
            if (botao) botao.disabled = true;

            ultimoEnvio = { containerId, statusId, botao };

            mqttClient.publish(TOPICS.cloroTara, JSON.stringify(payload), { qos: 0, retain: false }, err => {
                if (err) {
                    confirmarSalvo(containerId, statusId, botao, false);
                    if (status) status.textContent = 'Falha no envio';
                    ultimoEnvio = null;
                }
            });

            console.log('MQTT TX:', TOPICS.cloroTara, payload);
        }

        function salvarConfigHX711Engenharia(containerId, statusId, botao) {
            const status = document.getElementById(statusId);
            const fator = Number(document.getElementById('HX711_CAL_FACTOR')?.value || -7050);

            if (!mqttClient || !mqttClient.connected) {
                if (status) status.textContent = 'MQTT offline';
                return;
            }

            const payload = {
                HX711_CAL_FACTOR: fator
            };

            if (status) status.textContent = 'Enviando para central...';
            if (botao) botao.disabled = true;

            ultimoEnvio = { containerId, statusId, botao };

            mqttClient.publish(TOPICS.cloroTara, JSON.stringify(payload), { qos: 0, retain: false }, err => {
                if (err) {
                    confirmarSalvo(containerId, statusId, botao, false);
                    if (status) status.textContent = 'Falha no envio';
                    ultimoEnvio = null;
                }
            });

            console.log('MQTT TX:', TOPICS.cloroTara, payload);
        }


        function converterTipos(dados) {
            const convertido = {};

            Object.keys(dados).forEach(tag => {
                const valor = dados[tag];

                if (valor === 'true') convertido[tag] = true;
                else if (valor === 'false') convertido[tag] = false;
                else if (tag.includes('NAME') || tag === 'CONTROL_MODE') convertido[tag] = valor;
                else if (valor !== '' && !isNaN(valor)) convertido[tag] = Number(valor);
                else convertido[tag] = valor;
            });

            return convertido;
        }

        function processarAck(resp) {
            if (!ultimoEnvio) return;

            confirmarSalvo(
                ultimoEnvio.containerId,
                ultimoEnvio.statusId,
                ultimoEnvio.botao,
                resp.ok === true
            );

            const status = document.getElementById(ultimoEnvio.statusId);
            if (status && resp.msg) status.textContent = resp.msg;

            ultimoEnvio = null;
        }

        function carregarConfiguracoesNaTela(config) {
            /*
                IMPORTANTE:
                Essa função recebe a configuração atual da central via MQTT.

                Regra correta de HMI:
                - Se o campo estiver normal, pode atualizar com o valor da central.
                - Se o campo estiver amarelo/alterado, NÃO pode mexer nele.
                - Se o operador estiver digitando no campo, NÃO pode mexer nele.
                - O campo só volta ao normal depois do ACK do botão Salvar.
            */

            if (config.engenharia) preencherCamposPorTags(config.engenharia);
            if (config.configuracao) {
                ultimaConfigOperacional = { ...ultimaConfigOperacional, ...config.configuracao };
                preencherCamposPorTags(config.configuracao);
                atualizarApresentacaoNivelDashboard(ultimoStatusSistema?.sistema || {});
            }
            if (Array.isArray(config.pocos)) config.pocos.forEach(p => preencherCamposPorTags(p));
        }


        function preencherCamposPorTags(dados) {
            Object.keys(dados).forEach(tag => {
                document.querySelectorAll('.tag-hmi').forEach(tagEl => {
                    if (tagEl.textContent.trim() === tag) {
                        const campo = tagEl.parentElement.querySelector('.input-hmi');
                        if (!campo) return;

                        // Não atualiza campo que o operador está digitando
                        if (document.activeElement === campo) return;

                        // Não atualiza nem limpa campo alterado/amarelo
                        if (campo.classList.contains('changed')) return;

                        // Atualiza somente campos normais
                        campo.value = dados[tag];
                        campo.dataset.valorOriginal = String(dados[tag]);
                        campo.classList.remove('saved-ok');
                    }
                });
            });
        }

        function confirmarSalvo(containerId, statusId, botao, ok) {
            const container = document.getElementById(containerId);
            const status = document.getElementById(statusId);

            if (ok) {
                container.querySelectorAll('.input-hmi.changed').forEach(campo => {
                    campo.dataset.valorOriginal = campo.value;
                    campo.classList.remove('changed');
                    campo.classList.add('saved-ok');

                    setTimeout(() => {
                        campo.classList.remove('saved-ok');
                    }, 900);
                });

                status.textContent = 'Configuração salva';
            } else {
                status.textContent = 'Falha ao salvar';
            }

            if (botao) botao.disabled = false;
            lucide.createIcons();
        }


        // =========================
        // DASHBOARD MQTT
        // =========================
        function etapaOperacional(sis = {}) {
            if (sis.ligado === false || sis.botao_ligado === false) return 'DESLIGADO';
            if (sis.modo_retro || sis.retro_ativa) return 'RETROLAVAGEM';
            if (sis.manual_ativo || sis.modo_manual_operacional) return 'MANUAL';
            return 'CONTROLE DE NÍVEL';
        }
        function atualizarDashboardSistema(obj) {
            ultimoStatusSistema = obj;
            const sis = obj.sistema || {};

            setText('dashSensorTipo', Number(sis.sensor_nivel_tipo) === 1 ? 'ANALÓGICO' : 'DIGITAL');
            setText('dashModo', sis.control_mode || '--');
            setText('dashEtapaOperacional', etapaOperacional(sis));
            setText('dashRetro', sis.modo_retro ? 'ATIVA' : 'NORMAL');
            setMetricWithUnit('dashVazao', formatNum(sis.vazao_comandada || 0, 1), 'm³/h');
            atualizarApresentacaoNivelDashboard(sis);

            setText('retroModoAtual', sis.modo_retro ? 'ATIVA' : 'NORMAL');
            setText('dashRetroModoResumo', sis.modo_retro ? 'ATIVA' : 'NORMAL');
            setText('retroVazaoAlvo', formatNum(sis.bw_target_flow || 0, 1));
            setText('dashRetroVazaoAlvoResumo', formatNum(sis.bw_target_flow || 0, 1));
            setText('retroVazaoAtual', formatNum(sis.vazao_retro_atual || 0, 1));
            setText('retroRampa', sis.bw_ramp_time || 0);
            setText('dashRetroRampaResumo', sis.bw_ramp_time || 0);

            atualizarEnergia();
            detectarEventoRetro(sis);
            lucide.createIcons();
        }

        function valorConfigNumerico(tag, fallback = 0) {
            const tagEl = Array.from(document.querySelectorAll('.tag-hmi')).find(el => el.textContent.trim() === tag);
            const campoInput = tagEl ? tagEl.parentElement.querySelector('.input-hmi') : null;
            const valorTela = campoInput && campoInput.value !== '' ? Number(campoInput.value) : NaN;
            const valorConfig = Number(ultimaConfigOperacional[tag]);

            if (Number.isFinite(valorTela)) return valorTela;
            if (Number.isFinite(valorConfig)) return valorConfig;
            return fallback;
        }

        function atualizarApresentacaoNivelDashboard(sis = {}) {
            const sensorTela = document.getElementById('LEVEL_SENSOR_SEL')?.value;
            const sensorTipo = Number(sensorTela !== undefined && sensorTela !== '' ? sensorTela : (sis.sensor_nivel_tipo ?? ultimaConfigOperacional.LEVEL_SENSOR_SEL ?? 0));
            const analogico = sensorTipo === 1;
            const nivelDigital = Boolean(sis.nivel_digital);
            const nivelAnalogico = Math.max(0, Math.min(100, Number(sis.nivel_percent || 0)));
            const nivelDigitalSimulado = nivelDigital ? 75 : 90;
            const nivelExibido = analogico ? nivelAnalogico : nivelDigitalSimulado;
            const startSetpoint = valorConfigNumerico('START_SETPOINT', 40);
            const stopSetpoint = valorConfigNumerico('STOP_SETPOINT', 95);

            const tanque = document.getElementById('dashNivelTanque');
            const digitalCard = document.getElementById('dashNivelDigitalCard');
            const setpoints = document.getElementById('dashSetpointsAnalogicos');
            const barra = document.getElementById('dashNivelBarra');
            const box = document.getElementById('dashNivelEstadoBox');

            if (tanque) tanque.classList.toggle('hidden', !analogico);
            if (digitalCard) digitalCard.classList.toggle('hidden', analogico);
            if (setpoints) setpoints.classList.toggle('hidden', !analogico);
            if (barra) barra.style.height = nivelExibido + '%';

            setText('dashSensorTipo', analogico ? 'ANALÓGICO' : 'DIGITAL');
            setText('dashNivelPercent', analogico ? formatNum(nivelAnalogico, 0) + '%' : '--');
            setText('dashNivelDigitalValor', nivelDigital ? 'Pedindo água' : 'Boia cheia');
            setText('dashNivelDigitalHint', nivelDigital ? 'Equivalente operacional: 75%' : 'Equivalente operacional: 90%');
            setText('dashStartSetpoint', formatNum(startSetpoint, 0));
            setText('dashStopSetpoint', formatNum(stopSetpoint, 0));

            let nivelEstado;
            if (analogico) {
                if (nivelAnalogico <= startSetpoint) nivelEstado = 'Abaixo do liga';
                else if (nivelAnalogico >= stopSetpoint) nivelEstado = 'Nível de parada';
                else nivelEstado = 'Faixa operacional';
            } else {
                nivelEstado = nivelDigital ? 'Boia pedindo água' : 'Boia cheia';
            }
            setText('dashNivelEstado', nivelEstado);

            if (box) {
                box.className = nivelDigital ? 'state-box state-demand' : 'state-box state-ok';
            }
        }
        function atualizarDashboardRadio(obj) {
            ultimoStatusRadio = obj;
            const pocos = obj.pocos || [];
            const grid = document.getElementById('dashboardPocosGrid');
            if (!grid) return;

            setText('dashRadioResumo', `${pocos.filter(p => p.online).length}/${pocos.length} poços online`);

            grid.innerHTML = pocos.map(p => cardPocoDashboard(p)).join('');
            atualizarEnergia();
            lucide.createIcons();
        }

        function cardPocoDashboard(p) {
            const id = String(p.id).padStart(2, '0');
            let classe = 'border-2 border-slate-200';
            let badge = '<span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">Standby</span>';

            if (p.offline || p.falha_com) {
                classe = 'opacity-70 grayscale border-2 border-slate-300';
                badge = '<span class="text-[9px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">Offline</span>';
            } else if (p.ligado_valido) {
                classe = 'border-2 border-emerald-500 manual-ready';
                badge = '<span class="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm uppercase">Operando</span>';
            } else if (p.comando && !p.feedback) {
                classe = 'well-warning manual-ready';
                badge = '<span class="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase">Aguardando FB</span>';
            } else if (!p.comando && p.feedback) {
                classe = 'well-error manual-ready';
                badge = '<span class="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded uppercase">FB Indevido</span>';
            }

            return `
                <div class="card p-5 ${classe}">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="font-extrabold text-slate-800 text-lg leading-tight uppercase">
                                <small class="text-xs text-slate-400 mr-1 font-mono">ID:${id}</small> ${p.nome || ('Poço ' + id)}
                            </h4>
                            <p class="text-[9px] font-black text-slate-400 uppercase mt-1">${formatNum(p.vazao_m3h || 0, 1)} m³/h • ${formatNum(p.potencia_kw || 0, 1)} kW</p>
                        </div>
                        ${badge}
                    </div>
                    <div class="grid grid-cols-3 gap-2 border-t pt-4">
                        <div class="text-center"><i data-lucide="${p.online ? 'rss' : 'wifi-off'}" class="w-6 h-6 mx-auto mb-1 ${p.online ? 'status-ok' : 'status-error'}"></i><p class="text-[8px] font-bold text-slate-400 uppercase">Rádio</p></div>
                        <div class="text-center"><i data-lucide="${p.comando ? 'power' : 'power-off'}" class="w-6 h-6 mx-auto mb-1 ${p.comando ? 'status-cmd' : 'status-off'}"></i><p class="text-[8px] font-bold text-slate-400 uppercase">Cmd ${p.comando ? 'ON' : 'OFF'}</p></div>
                        <div class="text-center"><i data-lucide="settings" class="w-6 h-6 mx-auto mb-1 ${p.feedback ? 'status-ok spin-slow' : 'status-off'}"></i><p class="text-[8px] font-bold text-slate-400 uppercase">FB ${p.feedback ? 'ON' : 'OFF'}</p></div>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                        <div>Uso: ${formatTempo(p.tempo_uso_s || 0)}</div>
                        <div>Partidas: ${p.acionamentos || 0}</div>
                    </div>
                </div>
            `;
        }

        // =========================
        // ALARMES
        // =========================
        function atualizarTelaAlarmes(obj) {
            ultimosAlarmes = obj.ativos || [];
            setText('dashAlarmQtd', obj.quantidade || ultimosAlarmes.length);
            setText('dashAlarmResumo', ultimosAlarmes.length ? ultimosAlarmes[0].descricao : 'Sem alarmes ativos');
            setText('status-alarmes', ultimosAlarmes.length ? `${ultimosAlarmes.length} alarme(s) ativo(s)` : 'Sem alarmes ativos');

            const lista = document.getElementById('alarmesAtivosLista');
            if (!lista) return;

            if (!ultimosAlarmes.length) {
                lista.innerHTML = `<div class="card p-5 border border-emerald-200 bg-emerald-50 text-emerald-700 font-black uppercase text-xs">Nenhum alarme ativo</div>`;
            } else {
                lista.innerHTML = ultimosAlarmes.map(a => `
                    <div class="card p-5 well-error">
                        <div class="flex justify-between gap-4">
                            <div>
                                <h3 class="text-sm font-black text-red-700 uppercase">${a.codigo}</h3>
                                <p class="text-xs font-bold text-red-900 mt-2">${a.descricao}</p>
                            </div>
                            <span class="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded h-fit">P${a.poco || '-'}</span>
                        </div>
                    </div>
                `).join('');
            }

            lucide.createIcons();
        }

        function processarEventoAlarme(evt) {
            eventosAlarmes.unshift({
                data: new Date(),
                ...evt
            });

            eventosAlarmes = eventosAlarmes.slice(0, 20);
            renderEventosAlarmes();

            if (evt.ativo && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    const n = new Notification('Alarme Smart Level', { body: evt.descricao || evt.codigo });
                    n.onclick = () => {
                        window.focus();
                        const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.textContent.includes('Alarmes'));
                        if (btn) abrirAba('alarmes', btn);
                    };
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }

        function renderEventosAlarmes() {
            const lista = document.getElementById('eventosAlarmesLista');
            if (!lista) return;

            if (!eventosAlarmes.length) {
                lista.innerHTML = `<p class="text-xs font-bold text-slate-400 uppercase">Nenhum evento recebido ainda</p>`;
                return;
            }

            lista.innerHTML = eventosAlarmes.map(e => `
                <div class="flex items-center justify-between gap-4 p-3 rounded-xl border ${e.ativo ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}">
                    <div>
                        <p class="text-xs font-black ${e.ativo ? 'text-red-700' : 'text-emerald-700'} uppercase">${e.ativo ? 'ATIVO' : 'RESET'} • ${e.codigo}</p>
                        <p class="text-xs font-bold text-slate-700">${e.descricao || ''}</p>
                    </div>
                    <span class="text-[10px] font-black text-slate-400">${e.data.toLocaleTimeString()}</span>
                </div>
            `).join('');
        }

        // =========================
        // ENERGIA
        // =========================
        function atualizarEnergia() {
            const pocos = ultimoStatusRadio?.pocos || [];
            const cfg = ultimoStatusSistema?.sistema || {};
            const preco = Number(cfg.energy_cost_kwh || getCampoPorTag('ENERGY_COST_KWH') || 0);

            let totalKwh = 0;
            let totalValor = 0;

            pocos.forEach(p => {
                const tempoH = Number(p.tempo_energia_parcial_s || 0) / 3600;
                const kwh = tempoH * Number(p.potencia_kw || 0);
                const valor = kwh * preco;
                totalKwh += kwh;
                totalValor += valor;
            });

            setText('dashKwhTotal', formatNum(totalKwh, 2));
            setText('dashValorTotal', formatNum(totalValor, 2));
            setText('energiaTotalKwh', formatNum(totalKwh, 2));
            setText('energiaTotalValor', formatNum(totalValor, 2));
            setText('energiaValorKwh', formatNum(preco, 2));
        }
        // =========================
        // RETRO
        // =========================
        function detectarEventoRetro(sis) {
            const ativo = !!sis.modo_retro;

            if (ativo && !retroAnteriorAtivo) {
                retroInicioLocal = new Date();
                eventosRetro.unshift({
                    inicio: retroInicioLocal,
                    fim: null,
                    duracao: null,
                    vazaoAlvo: sis.bw_target_flow || 0,
                    vazaoFinal: sis.vazao_retro_atual || 0,
                    status: 'EM ANDAMENTO'
                });
                renderRetroEventos();
            }

            if (!ativo && retroAnteriorAtivo) {
                const fim = new Date();
                if (eventosRetro.length && !eventosRetro[0].fim) {
                    eventosRetro[0].fim = fim;
                    eventosRetro[0].duracao = Math.round((fim - eventosRetro[0].inicio) / 1000);
                    eventosRetro[0].vazaoFinal = sis.vazao_retro_atual || 0;
                    eventosRetro[0].status = 'FINALIZADA';
                }
                renderRetroEventos();
            }

            retroAnteriorAtivo = ativo;
        }

        function renderRetroEventos() {
            const lista = document.getElementById('retroEventosLista');
            if (!lista) return;

            if (!eventosRetro.length) {
                lista.innerHTML = `<p class="text-xs font-bold text-slate-400 uppercase">Nenhum registro de retro nesta sessão do APP</p>`;
                return;
            }

            lista.innerHTML = eventosRetro.map(r => `
                <div class="card p-4 border-l-4 ${r.status === 'EM ANDAMENTO' ? 'border-l-blue-600' : 'border-l-emerald-500'}">
                    <div class="flex justify-between gap-4">
                        <div>
                            <h3 class="text-xs font-black text-slate-700 uppercase">${r.status}</h3>
                            <p class="text-xs font-bold text-slate-500 mt-1">Início: ${r.inicio.toLocaleString()}</p>
                            <p class="text-xs font-bold text-slate-500">Fim: ${r.fim ? r.fim.toLocaleString() : '--'}</p>
                        </div>
                        <div class="text-right text-xs font-bold text-slate-600">
                            <p>Duração: ${r.duracao ? formatTempo(r.duracao) : '--'}</p>
                            <p>Alvo: ${formatNum(r.vazaoAlvo, 1)} m³/h</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // =========================
        // UTILIDADES
        // =========================
        function setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        function setMetricWithUnit(id, value, unit) {
            const el = document.getElementById(id);
            if (!el) return;
            const html = '<span class="metric-value">' + value + '</span> <small class="unit-small">' + unit + '</small>';
            if (el.innerHTML !== html) el.innerHTML = html;
        }
        function formatNum(n, casas = 1) {
            return Number(n || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: casas,
                maximumFractionDigits: casas
            });
        }

        function formatTempo(seg) {
            seg = Number(seg || 0);
            const h = Math.floor(seg / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = Math.floor(seg % 60);

            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        }

        function getCampoPorTag(tag) {
            let valor = null;
            document.querySelectorAll('.tag-hmi').forEach(tagEl => {
                if (tagEl.textContent.trim() === tag) {
                    const campo = tagEl.parentElement.querySelector('.input-hmi');
                    if (campo) valor = campo.value;
                }
            });
            return valor;
        }



        function formatarTempoEnergia(segundos) {
            segundos = Number(segundos || 0);
            const h = Math.floor(segundos / 3600);
            const m = Math.floor((segundos % 3600) / 60);
            const s = Math.floor(segundos % 60);

            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        }

        function moedaBR(valor) {
            return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
        }

        function kwhBR(valor) {
            return Number(valor || 0).toFixed(2).replace('.', ',') + ' kWh';
        }

        function setTextStable(el, valor) {
            if (!el) return;
            const texto = String(valor);
            if (el.textContent !== texto) el.textContent = texto;
        }

        function criarCardEnergiaPoco(p) {
            const div = document.createElement('div');
            div.className = 'card p-5 border-t-4 border-t-cyan-500 energia-poco-card';
            div.id = 'energia-card-poco-' + String(p.id);
            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase">Poco <span data-energia="id"></span></p>
                        <h3 class="font-black text-slate-800 uppercase" data-energia="nome"></h3>
                    </div>
                    <span class="text-[10px] font-black bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-100" data-energia="potencia"></span>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between text-sm font-bold">
                        <span class="text-slate-500">Tempo parcial</span>
                        <span class="text-slate-800 tabular-nums" data-energia="tempo_parcial"></span>
                    </div>
                    <div class="flex justify-between text-sm font-bold">
                        <span class="text-slate-500">Tempo total</span>
                        <span class="text-slate-800 tabular-nums" data-energia="tempo_total"></span>
                    </div>
                    <div class="flex justify-between text-sm font-bold">
                        <span class="text-slate-500">Consumo parcial</span>
                        <span class="text-blue-600 tabular-nums" data-energia="kwh"></span>
                    </div>
                    <div class="flex justify-between text-sm font-bold">
                        <span class="text-slate-500">Valor parcial</span>
                        <span class="text-emerald-600 tabular-nums" data-energia="valor"></span>
                    </div>
                    <div class="flex justify-between text-sm font-bold">
                        <span class="text-slate-500">Acionamentos</span>
                        <span class="text-slate-800 tabular-nums" data-energia="acionamentos"></span>
                    </div>
                </div>
            `;
            return div;
        }

        function atualizarCardEnergiaPoco(card, p) {
            const set = (campo, valor) => setTextStable(card.querySelector(`[data-energia="${campo}"]`), valor);
            set('id', p.id || '--');
            set('nome', p.nome || ('Poco ' + p.id));
            set('potencia', `${Number(p.potencia_kw || 0).toFixed(1).replace('.', ',')} kW`);
            set('tempo_parcial', formatarTempoEnergia(p.tempo_parcial_s));
            set('tempo_total', formatarTempoEnergia(p.tempo_total_s));
            set('kwh', kwhBR(p.kwh));
            set('valor', moedaBR(p.valor));
            set('acionamentos', p.acionamentos || 0);
        }

        function atualizarTelaEnergiaESP(data) {
            console.log('ENERGIA ESP:', data);

            const totalKwh = Number(data.total_kwh || 0);
            const totalValor = Number(data.total_valor || 0);
            const totalTempo = Number(data.total_tempo_s || 0);
            const precoKwh = Number(data.preco_kwh || 0);

            setTextStable(document.getElementById('energia-total-kwh'), kwhBR(totalKwh));
            setTextStable(document.getElementById('energiaTotalKwh'), totalKwh.toFixed(2).replace('.', ','));
            setTextStable(document.getElementById('dashKwhTotal'), totalKwh.toFixed(2).replace('.', ','));

            setTextStable(document.getElementById('energia-total-valor'), moedaBR(totalValor));
            setTextStable(document.getElementById('energiaTotalValor'), totalValor.toFixed(2).replace('.', ','));
            setTextStable(document.getElementById('dashValorTotal'), totalValor.toFixed(2).replace('.', ','));

            setTextStable(document.getElementById('energia-preco-kwh'), moedaBR(precoKwh));
            setTextStable(document.getElementById('energiaValorKwh'), precoKwh.toFixed(2).replace('.', ','));
            setTextStable(document.getElementById('energia-total-tempo'), formatarTempoEnergia(totalTempo));

            const grid = document.getElementById('energiaPocosGrid');
            if (!grid || !Array.isArray(data.pocos)) return;

            const idsAtuais = new Set(data.pocos.map(p => 'energia-card-poco-' + String(p.id)));
            Array.from(grid.children).forEach(card => {
                if (!idsAtuais.has(card.id)) card.remove();
            });

            data.pocos.forEach(p => {
                const idCard = 'energia-card-poco-' + String(p.id);
                let card = document.getElementById(idCard);
                if (!card) {
                    card = criarCardEnergiaPoco(p);
                    grid.appendChild(card);
                }
                atualizarCardEnergiaPoco(card, p);
            });
        }

        function formatarDuracaoRetro(segundos) {
            segundos = Number(segundos || 0);
            const h = Math.floor(segundos / 3600);
            const m = Math.floor((segundos % 3600) / 60);
            const s = Math.floor(segundos % 60);

            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        }

        function atualizarHistoricoRetroESP(data) {
            console.log('HISTÓRICO RETRO ESP:', data);

            const tabela = document.getElementById('retroHistoricoTabela');
            const resumo = document.getElementById('retroHistoricoResumo');
            const status = document.getElementById('status-retro');

            if (status) status.textContent = 'Histórico salvo no ESP32';

            const registros = Array.isArray(data.registros) ? data.registros.slice(0, 100) : [];

            if (resumo) {
                resumo.textContent = `${registros.length} de ${data.max || 100} registros`;
            }

            if (!tabela) return;

            tabela.innerHTML = '';

            if (registros.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="6" class="p-4 text-center text-slate-400 font-bold">
                        Nenhuma retro registrada ainda.
                    </td>
                `;
                tabela.appendChild(tr);
                return;
            }

            registros.forEach(r => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-slate-100 hover:bg-slate-50 text-sm font-bold text-slate-700';

                const pocos = Array.isArray(r.pocos) && r.pocos.length
                    ? r.pocos.map(p => 'P' + p).join(', ')
                    : '--';

                tr.innerHTML = `
                    <td class="p-2 whitespace-nowrap">${r.inicio || '--'}</td>
                    <td class="p-2 whitespace-nowrap">${r.fim || '--'}</td>
                    <td class="p-2 whitespace-nowrap">${formatarDuracaoRetro(r.duracao_s)}</td>
                    <td class="p-2 whitespace-nowrap">${pocos}</td>
                    <td class="p-2 whitespace-nowrap">${Number(r.vazao_alvo || 0).toFixed(1)} m³/h</td>
                    <td class="p-2 whitespace-nowrap">${Number(r.vazao_final || 0).toFixed(1)} m³/h</td>
                `;

                tabela.appendChild(tr);
            });
        }


        function resetarEnergiaParcial() {
            if (!mqttClient || (typeof mqttClient.connected === 'boolean' && !mqttClient.connected)) {
                alert('MQTT offline');
                return;
            }

            if (!confirm('Resetar energia parcial?')) return;

            mqttClient.publish(TOPICS.energiaReset, JSON.stringify({
                cmd: 'RESET_ENERGY',
                origem: 'APP',
                timestamp_app: Date.now()
            }), { qos: 0, retain: false });
        }


        alternarCamposNivelAnalogico();
        monitorarAlteracoes();
        iniciarWatchdogCentral();
        iniciarMQTT();
        lucide.createIcons();
    
        function atualizarCardCloracaoDashboard(sis) {
            if (!sis) return;

            const fmt1 = v => Number(v || 0).toFixed(1).replace('.', ',');
            const fmt2 = v => Number(v || 0).toFixed(2).replace('.', ',');
            const fmt3 = v => Number(v || 0).toFixed(3).replace('.', ',');

            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if (el && el.textContent !== String(valor)) el.textContent = valor;
            };

            setText('cloroPpmAlvo', fmt2(sis.cloro_ppm_alvo));
            setText('cloroTempoOn', fmt1(sis.cloro_pulso_on_s ?? sis.cloro_tempo_on_s));
            setText('cloroDuty', fmt1(sis.cloro_duty_percent));
            setText('cloroPulsosCiclo', Number(sis.cloro_pulsos_ciclo || 0));
            setText('cloroCiclo', Number(sis.cloro_ciclo_s || 0));
            setText('cloroVazaoAgua', fmt1(sis.cloro_vazao_agua_m3h));
            setText('cloroBombaLh', fmt1(sis.cloro_bomba_lh));
            setText('cloroConcentracao', fmt1(sis.cloro_concentracao));
            setText('cloroDosagemLh', fmt3(sis.cloro_dosagem_lh));

            const bomba = document.getElementById('cloroBombaEstado');
            if (bomba) {
                const ligada = !!sis.cloro_bomba_ligada;
                bomba.textContent = ligada ? 'ON' : 'OFF';
                bomba.className = ligada
                    ? 'text-2xl font-black text-emerald-600'
                    : 'text-2xl font-black text-slate-800';
            }

            const badge = document.getElementById('cloroStatusBadge');
            if (badge) {
                if (sis.modo_retro || sis.retro_ativa) {
                    badge.textContent = 'Bloqueada por retro';
                    badge.className = 'save-status bg-orange-50 text-orange-600 border-orange-100';
                } else if (sis.cloro_ativo) {
                    badge.textContent = 'Dosando em enchimento';
                    badge.className = 'save-status bg-emerald-50 text-emerald-600 border-emerald-100';
                } else {
                    badge.textContent = 'Aguardando enchimento';
                    badge.className = 'save-status';
                }
            }
        }


        function atualizarCardCloroBalanca(sis) {
            if (!sis) return;
            const fmt2 = v => Number(v || 0).toFixed(2).replace('.', ',');
            const setText = (id, valor) => {
                const el = document.getElementById(id);
                if (el && el.textContent !== String(valor)) el.textContent = valor;
            };

            setText('cloroPesoKg', fmt2(sis.cloro_peso_kg));
            setText('cloroPesoAlarmeKg', fmt2(sis.cloro_peso_alarme_kg));

            const badge = document.getElementById('cloroStatusBadge');
            if (badge && sis.cloro_baixo) {
                badge.textContent = 'Cloro baixo';
                badge.className = 'save-status bg-red-50 text-red-600 border-red-100';
            }

            const inpPeso = document.getElementById('CL_TANK_LOW_KG');
            if (inpPeso && document.activeElement !== inpPeso && !inpPeso.classList.contains('dirty')) {
                inpPeso.value = Number(sis.cloro_peso_alarme_kg || 0).toFixed(1);
            }

            const inpTempo = document.getElementById('CL_LOW_DELAY_S');
            if (inpTempo && document.activeElement !== inpTempo && !inpTempo.classList.contains('dirty')) {
                inpTempo.value = Math.round(Number(sis.cloro_tempo_alarme_ms || 0) / 1000);
            }

            const inpFator = document.getElementById('HX711_CAL_FACTOR');
            if (inpFator && document.activeElement !== inpFator && !inpFator.classList.contains('dirty')) {
                inpFator.value = Number(sis.cloro_fator_calibracao || -7050).toFixed(0);
            }
        }














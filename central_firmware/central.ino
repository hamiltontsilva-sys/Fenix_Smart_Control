/* CENTRAL V6.3 - Adicionado topic central/retropocos_status */

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <EEPROM.h>

// ---------- WIFI ----------
const char* ssid = "Hamilton";
const char* password = "04321518";

// ---------- MQTT ----------
const char* mqtt_server = "y1184ab7.ala.us-east-1.emqxsl.com";
const int   mqtt_port   = 8883;

// credenciais corretas:
const char* mqtt_user   = "Admin";
const char* mqtt_pass   = "Admin";

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ---------- LCD ----------
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ---------- PINOS ----------
#define PIN_LIGA   D5
#define PIN_BOIA   D6
#define PIN_RETRO  D7
#define PIN_MANUAL D8  

// ---------- EEPROM ----------
#define EEPROM_SIZE 64
#define ADDR_MODE   0  
#define ADDR_PMAN   1  

// ---------- VARIÁVEIS ----------
bool sistema_ligado = false;
int poco_ativo = 1;
unsigned long ultimo_revezamento = 0;
int horas_revezamento = 3;

int fluxo1 = 0, fluxo2 = 0, fluxo3 = 0;

int retroA = 1;
int retroB = 1;

unsigned long last_p1 = 0;
unsigned long last_p2 = 0;
unsigned long last_p3 = 0;

unsigned long POCO_ALIVE_TIMEOUT = 15000UL;

bool retrolavagem_ativa = false;
String last_cmd = "";

bool manual_mode = false;
int manual_poco = 1;

// ---------- SISTEMA ANTI-SPAM ----------
struct PublishStore {
  String key[50];
  String val[50];
  int n = 0;

  String get(String k) {
    for (int i = 0; i < n; i++) if (key[i] == k) return val[i];
    return "";
  }

  void set(String k, String v) {
    for (int i = 0; i < n; i++) {
      if (key[i] == k) { val[i] = v; return; }
    }
    if (n < 50) { key[n] = k; val[n] = v; n++; }
  }
} store;

void publishIfChanged2(const char* topic, String v) {
  String k = String(topic);
  if (store.get(k) != v) {
    client.publish(topic, v.c_str());
    store.set(k, v);
    Serial.printf("[PUB] %s -> %s\n", topic, v.c_str());
  }
}

String retroCode(int a, int b) {
  if (a == b) return String(a);
  int x = min(a,b), y = max(a,b);
  return String(x) + String(y);
}

// ---------- CALLBACK ----------
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i=0;i<length;i++) msg += (char)payload[i];

  String t = String(topic);
  Serial.printf("[MQTT] %s -> %s\n", topic, msg.c_str());

  if (t == "central/horas") {
    horas_revezamento = msg.toInt();
    publishIfChanged2("central/horas_status", String(horas_revezamento));
  }
  else if (t == "central/ligar") {
    sistema_ligado = !sistema_ligado;
    publishIfChanged2("central/sistema", sistema_ligado ? "1":"0");
  }
  else if (t == "central/retroA") {
    retroA = msg.toInt();
    publishIfChanged2("central/retropocos", retroCode(retroA,retroB));
    publishIfChanged2("central/retropocos_status", "A:" + String(retroA) + " B:" + String(retroB));
  }
  else if (t == "central/retroB") {
    retroB = msg.toInt();
    publishIfChanged2("central/retropocos", retroCode(retroA,retroB));
    publishIfChanged2("central/retropocos_status", "A:" + String(retroA) + " B:" + String(retroB));
  }

  else if (t == "pocos/fluxo1") fluxo1 = msg.toInt();
  else if (t == "pocos/fluxo2") fluxo2 = msg.toInt();
  else if (t == "pocos/fluxo3") fluxo3 = msg.toInt();

  else if (t == "pocos/p1_alive") { last_p1 = millis(); publishIfChanged2("central/p1_online","1"); }
  else if (t == "pocos/p2_alive") { last_p2 = millis(); publishIfChanged2("central/p2_online","1"); }
  else if (t == "pocos/p3_alive") { last_p3 = millis(); publishIfChanged2("central/p3_online","1"); }

  else if (t == "central/timeout") {
    int s = msg.toInt();
    if (s < 5) s = 5;
    POCO_ALIVE_TIMEOUT = (unsigned long)s * 1000UL;
    client.publish("pocos/timeout", String(s).c_str());
    publishIfChanged2("central/timeout_status", String(s));
  }

  else if (t == "central/manual_mode") {
    manual_mode = msg.toInt() != 0;
    EEPROM.write(ADDR_MODE, manual_mode ? 1 : 0);
    EEPROM.commit();
    publishIfChanged2("central/manual_mode", manual_mode ? "1":"0");
  }

  else if (t == "central/manual_poco") {
    int v = msg.toInt();
    if (v>=1 && v<=3) {
      manual_poco = v;
      EEPROM.write(ADDR_PMAN, v);
      EEPROM.commit();
      publishIfChanged2("central/manual_poco", String(v));
    }
  }
}

// ---------- RECONNECT ----------
void reconnect() {
  while (!client.connected()) {
    Serial.print("Conectando MQTT... ");

    if (client.connect("ESP-Central", mqtt_user, mqtt_pass)) {
      Serial.println("OK");

      client.subscribe("pocos/fluxo1");
      client.subscribe("pocos/fluxo2");
      client.subscribe("pocos/fluxo3");
      client.subscribe("pocos/p1_alive");
      client.subscribe("pocos/p2_alive");
      client.subscribe("pocos/p3_alive");

      client.subscribe("central/horas");
      client.subscribe("central/ligar");
      client.subscribe("central/retroA");
      client.subscribe("central/retroB");
      client.subscribe("central/timeout");
      client.subscribe("central/manual_mode");
      client.subscribe("central/manual_poco");

      publishIfChanged2("central/sistema", sistema_ligado ? "1":"0");
      publishIfChanged2("central/horas_status", String(horas_revezamento));
      publishIfChanged2("central/poco_ativo", String(poco_ativo));
      publishIfChanged2("central/retropocos", retroCode(retroA,retroB));
      publishIfChanged2("central/retropocos_status", "A:" + String(retroA) + " B:" + String(retroB));
      publishIfChanged2("central/retrolavagem", retrolavagem_ativa ? "1":"0");
      publishIfChanged2("central/timeout_status", String(POCO_ALIVE_TIMEOUT/1000UL));
      publishIfChanged2("central/manual_mode", manual_mode ? "1":"0");
      publishIfChanged2("central/manual_poco", String(manual_poco));

    } else {
      Serial.printf("Falhou rc=%d\n", client.state());
      delay(1500);
    }
  }
}

// ---------- STATUS ----------
bool pocoOnline(int p) {
  unsigned long now = millis();
  if (p==1) return (now-last_p1 < POCO_ALIVE_TIMEOUT);
  if (p==2) return (now-last_p2 < POCO_ALIVE_TIMEOUT);
  if (p==3) return (now-last_p3 < POCO_ALIVE_TIMEOUT);
  return false;
}

// ---------- LCD ----------
unsigned long last_lcd = 0;
int lcd_page = 0;

void showLCD(bool boia, bool retro) {
  if (millis()-last_lcd < 2000) return;
  last_lcd = millis();

  lcd.clear();

  if (lcd_page == 0) {
    lcd.setCursor(0,0);
    lcd.print("Sistema ");
    lcd.print(sistema_ligado ? "ON " : "OFF");
    lcd.setCursor(0,1);
    lcd.print("Modo:");
    lcd.print(manual_mode ? "MAN" : "AUTO");
    lcd_page = 1;
    return;
  }

  lcd.setCursor(0,0);
  lcd.print("P1:");
  lcd.print(pocoOnline(1) ? "ON ":"OFF");
  lcd.print(" P2:");
  lcd.print(pocoOnline(2) ? "ON":"OFF");

  lcd.setCursor(0,1);
  lcd.print("P3:");
  lcd.print(pocoOnline(3) ? "ON":"OFF");

  lcd_page = 0;
}

// ---------- AJUSTAR POÇO ----------
void ajustarPocoAtivo() {
  int tent = 0;
  int inicio = poco_ativo;

  while (!pocoOnline(poco_ativo) && tent < 3) {
    poco_ativo++;
    if (poco_ativo > 3) poco_ativo = 1;
    tent++;
    if (poco_ativo == inicio) break;
  }

  publishIfChanged2("central/poco_ativo", String(poco_ativo));
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();
  lcd.print("Iniciando...");

  pinMode(PIN_LIGA, INPUT_PULLUP);
  pinMode(PIN_BOIA, INPUT_PULLUP);
  pinMode(PIN_RETRO, INPUT_PULLUP);
  pinMode(PIN_MANUAL, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(200);

  EEPROM.begin(EEPROM_SIZE);
  manual_mode = EEPROM.read(ADDR_MODE);
  manual_poco = EEPROM.read(ADDR_PMAN);
  if (manual_poco < 1 || manual_poco > 3) manual_poco = 1;

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  ultimo_revezamento = millis();
}

// ---------- LOOP ----------
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  bool pulso = !digitalRead(PIN_LIGA);
  bool boia  = !digitalRead(PIN_BOIA);
  bool retro = !digitalRead(PIN_RETRO);

  int manual_pin_val = digitalRead(PIN_MANUAL);
  bool manual_pin_mode = (manual_pin_val == HIGH);

  static bool last_manual_pin_mode = false;
  if (manual_pin_mode != last_manual_pin_mode) {
    last_manual_pin_mode = manual_pin_mode;
    manual_mode = manual_pin_mode;
    EEPROM.write(ADDR_MODE, manual_mode ? 1 : 0);
    EEPROM.commit();
    publishIfChanged2("central/manual_mode", manual_mode ? "1":"0");
  }

  static bool last_pulso = false;
  static unsigned long last_pulso_time = 0;

  if (pulso != last_pulso && millis()-last_pulso_time > 80) {
    last_pulso = pulso;
    last_pulso_time = millis();

    if (pulso) {
      sistema_ligado = !sistema_ligado;
      publishIfChanged2("central/sistema", sistema_ligado ? "1":"0");
    }
  }

  publishIfChanged2("central/nivel", boia ? "1" : "0");

  // ---------- RETROLAVAGEM ----------
  if (retro && !retrolavagem_ativa) {
    retrolavagem_ativa = true;
    publishIfChanged2("central/retrolavagem","1");

    String cmd = retroCode(retroA,retroB);
    client.publish("pocos/cmd", cmd.c_str());
    last_cmd = cmd;
  }
  else if (!retro && retrolavagem_ativa) {
    retrolavagem_ativa = false;
    publishIfChanged2("central/retrolavagem","0");

    if (sistema_ligado && boia) {
      ajustarPocoAtivo();
      String cmd = String(poco_ativo);
      client.publish("pocos/cmd", cmd.c_str());
      last_cmd = cmd;
    } else {
      client.publish("pocos/cmd", "0");
      last_cmd = "0";
    }
  }

  // ---------- MODO MANUAL ----------
  if (manual_mode) {
    publishIfChanged2("central/manual_mode","1");
    publishIfChanged2("central/manual_poco", String(manual_poco));

    if (last_cmd != String(manual_poco)) {
      client.publish("pocos/cmd", String(manual_poco).c_str());
      last_cmd = String(manual_poco);
    }
  }

  // ---------- MODO AUTOMÁTICO ----------
  else {
    publishIfChanged2("central/manual_mode","0");

    if (!retrolavagem_ativa && sistema_ligado) {
      if (boia) {
        ajustarPocoAtivo();
        if (last_cmd != String(poco_ativo)) {
          client.publish("pocos/cmd", String(poco_ativo).c_str());
          last_cmd = String(poco_ativo);
        }
      } else {
        if (last_cmd != "0") {
          client.publish("pocos/cmd","0");
          last_cmd = "0";
        }
      }
    }

    unsigned long now = millis();
    if (sistema_ligado && !retrolavagem_ativa) {
      if (now - ultimo_revezamento > (unsigned long)horas_revezamento * 3600000UL) {
        poco_ativo++;
        if (poco_ativo > 3) poco_ativo = 1;

        ajustarPocoAtivo();
        ultimo_revezamento = now;

        if (boia) {
          client.publish("pocos/cmd", String(poco_ativo).c_str());
          last_cmd = String(poco_ativo);
        }
      }
    }
  }

  unsigned long now = millis();

  // ---------- ENVIO PERIÓDICO ----------
  static unsigned long last_retro_pub = 0;
  if (now - last_retro_pub >= 2000) {
    last_retro_pub = now;

    publishIfChanged2("central/retropocos", retroCode(retroA,retroB));

    publishIfChanged2(
      "central/retropocos_status",
      "A:" + String(retroA) + " B:" + String(retroB)
    );
  }

  if (last_p1==0 || now-last_p1 > POCO_ALIVE_TIMEOUT)
    publishIfChanged2("central/p1_online","0");
  if (last_p2==0 || now-last_p2 > POCO_ALIVE_TIMEOUT)
    publishIfChanged2("central/p2_online","0");
  if (last_p3==0 || now-last_p3 > POCO_ALIVE_TIMEOUT)
    publishIfChanged2("central/p3_online","0");

  showLCD(!digitalRead(PIN_BOIA), retrolavagem_ativa);
  delay(50);
}

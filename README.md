# 🤖 Amazon AutoBuy Bot

Bot automatizado para monitorear productos en Amazon México y realizar compras instantáneas usando Playwright + alertas de Telegram.

---

## 🚀 ¿Qué hace?

- Escucha alertas de canales de Telegram como `@goeyBOTS`
- Extrae el ASIN de los productos
- Abre Amazon (modo headless o visible)
- Detecta disponibilidad y precio
- Realiza la compra automáticamente si el precio es menor o igual al máximo definido
- Envía confirmación vía Telegram

---

## 📦 Requisitos

- Node.js 20+
- Google Chrome (si usas modo CDP)
- Cuenta de Amazon activa
- Bot de Telegram y token válido
- Claves API de Telegram (apiId, apiHash)
- Playwright instalado

---

## 📁 Estructura recomendada

```
amazon-autobot/
├── bots/
│   └── buyBot.js
├── core/
│   └── sessionManager.js
├── utils/
│   └── notifier.js
├── config/
│   └── targets.json
├── sessions/
│   └── bot-session.json
├── bridge.js
├── .session.txt
├── .gitignore
├── package.json
├── requirements.txt
└── README.md
```

---

## ⚙️ Instalación

```bash
# Instala dependencias
npm install

# Instala Playwright
npx playwright install

# Lanza Chrome con CDP (si no usas headless)
start chrome --remote-debugging-port=9222 --user-data-dir="C:\chrome-bot"
```

---

## 🧪 Ejecutar

```bash
# Modo Telegram listener
node bridge.js

# Modo monitoreo continuo
node bots/buyBot.js
```

---

## 🧩 Personaliza

Edita el archivo `config/targets.json` con tu lista de productos:

```json
[
  {
    "asin": "B0F2BDXW4J",
    "name": "Destined Rivals Elite Trainer Box",
    "maxPrice": 1400,
    "quantity": 1
  }
]
```

---

## 🔐 Seguridad

Este repositorio está preparado para trabajar en local. Nunca subas tu `.session.txt`, cookies o datos personales a GitHub público.

---

## 🛠️ Autor

Desarrollado por BluesZero

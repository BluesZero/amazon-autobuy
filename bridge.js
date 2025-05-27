import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";
import fs from "fs";
import { comprarProducto } from "./bots/buyBot.js";

const apiId = 21630481;
const apiHash = "c674329803087a28ba547879734ccad8";

let sessionString = "";
const sessionFile = "./.session.txt";
if (fs.existsSync(sessionFile)) {
  sessionString = fs.readFileSync(sessionFile, "utf8").trim();
}

const stringSession = new StringSession(sessionString);

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  if (!sessionString) {
    console.log("🔐 No hay sesión previa. Iniciando login interactivo...");

    await client.start({
      phoneNumber: async () => await input.text("📱 Tu número (con +52...): "),
      password: async () => await input.text("🔐 Tu contraseña (si tienes 2FA): "),
      phoneCode: async () => await input.text("💬 Código que recibiste por Telegram: "),
      onError: (err) => console.log(err),
    });

    const saved = client.session.save();
    fs.writeFileSync(sessionFile, saved, "utf8");
    console.log("\n✅ Sesión guardada en .session.txt");
  } else {
    await client.connect();
    console.log("✅ Sesión previa cargada desde .session.txt");
  }

  await client.sendMessage("me", { message: "🚀 Puente activo con GramJS y BuyBot" });

  const sourceChannel = "goeyBOTS";
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.message) return;

    const text = message.message;
    const asinMatch = text.match(/https?:\/\/(?:www\.)?amazon\.com\.mx\/dp\/([A-Z0-9]{10})/i);

    if (asinMatch) {
      const asin = asinMatch[1];
      console.log(`🧪 Llamando a comprarProducto con ASIN: ${asin}`);
      await comprarProducto(asin);
    } else {
      console.log("📨 Mensaje recibido, pero sin ASIN válido");
    }
  }, new NewMessage({ chats: [sourceChannel] }));

  console.log("📡 Escuchando mensajes nuevos desde @" + sourceChannel);
})();

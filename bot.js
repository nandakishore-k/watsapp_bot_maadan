const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode");
const qrTerm = require("qrcode-terminal");

const fs = require("fs");

function startBirthdayScheduler(sock) {
  console.log("🎂 Birthday scheduler started...");

  setInterval(async () => {
    const birthdays = JSON.parse(fs.readFileSync("./birthdays.json"));

  const today = new Date().toISOString().slice(5, 10); // MM-DD

  for (const groupId in birthdays) {
    for (const person of birthdays[groupId]) {
      if (person.date.slice(5, 10) === today) {
        const msg = `🎉 Happy Birthday *${person.name}*! 🎂🎁  
        Wishing you a year full of success and happiness! ❤️`;

        await sock.sendMessage(groupId, { text: msg });
        console.log(`Sent to ${person.name} in ${groupId}`);
      }
    }
  }

  }, 60 * 100); 
}


async function startBot() {
  console.log("🚀 Starting WhatsApp bot...");

  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false, // disable deprecated option
    auth: state,
    version,
    browser: ["Desktop", "Chrome", "10.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;

    // === QR CODE GENERATION ===
    if (qr) {
      console.log("📲 Scan the QR code:");

      // 1️⃣ Print QR in terminal
      qrTerm.generate(qr, { small: true });

      // 2️⃣ Save QR as PNG file
      await qrcode.toFile("./qr.png", qr);
      console.log("🖼 QR saved as qr.png");
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected!");
    }

    if (connection === "close") {
      console.log("❌ Connection closed. Reconnecting...");
      startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(msg.key.remoteJid, { text: "Hello! 👋" });
    }
  });


  sock.ev.on("connection.update", async (update) => {
  const { connection, qr } = update;

  if (connection === "open") {
    console.log("✅ WhatsApp Connected!");

    // const groups = await sock.groupFetchAllParticipating();
    // console.log("📌 Groups:", Object.keys(groups));

    await sock.sendMessage("120363422059320397@g.us", {
      text: "Hello! This is a test message from my bot 🚀"
    });

    startBirthdayScheduler(sock);

     // ▶ SEND TEST MESSAGE HERE
    // await sock.sendMessage("916235863510@s.whatsapp.net", {
    //     text: "Aliya, im an anonymous hacker, please add me to the group vazhapilly or i will hack you watsapp,-maadan bot 🚀"
    // });

    console.log("📨 Test message sent!");
  }
});



}



startBot();

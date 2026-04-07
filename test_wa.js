import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

const client = new Client({
  puppeteer: {
    headless: false, // para vermos o erro
    args: ["--no-sandbox"]
  },
  authStrategy: new LocalAuth({ clientId: "test-wa" }),
  webVersionCache: {
    type: "none"
  }
});

client.on("qr", (qr) => console.log("QR Recebido! Escaneie-o!"));
client.on("authenticated", () => console.log("Autenticado!"));
client.on("ready", () => {
    console.log("READY FIRED!");
    console.dir(client.info);
    process.exit(0);
});
client.on("auth_failure", (msg) => console.error("AUTH_FAILURE", msg));
client.on("disconnected", (r) => console.log("Disconnected", r));

client.initialize().catch(e => console.error(e));



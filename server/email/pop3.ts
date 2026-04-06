import net from "net";
import tls from "tls";

type Pop3Options = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  timeoutMs?: number;
};

export async function testPop3Connection(opts: Pop3Options): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const client = opts.secure
    ? tls.connect({ host: opts.host, port: opts.port, rejectUnauthorized: false })
    : net.connect({ host: opts.host, port: opts.port });

  const readLine = () =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("POP3 timeout")), timeoutMs);
      client.once("data", (data) => {
        clearTimeout(timer);
        resolve(data.toString());
      });
    });

  return new Promise<void>((resolve, reject) => {
    client.on("error", reject);

    (async () => {
      const greet = await readLine();
      if (!greet.startsWith("+OK")) throw new Error("POP3 greeting failed");

      client.write(`USER ${opts.username}\r\n`);
      const userResp = await readLine();
      if (!userResp.startsWith("+OK")) throw new Error("POP3 USER failed");

      client.write(`PASS ${opts.password}\r\n`);
      const passResp = await readLine();
      if (!passResp.startsWith("+OK")) throw new Error("POP3 PASS failed");

      client.write("QUIT\r\n");
      client.end();
      resolve();
    })().catch((err) => {
      client.end();
      reject(err);
    });
  });
}






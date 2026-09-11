// Unisce i pezzi di sorgenti/ in:
//   index.html                      -> l'app per il telefono (GitHub Pages)
//   costruito/artifact.html         -> la versione pubblicata su claude.ai (senza <html>/<head>, li aggiunge l'artifact)
//   Desktop\Settimana nel piatto.html -> copia da aprire sul PC senza rete
// Uso: node strumenti/costruisci.mjs   (poi alzare VERSIONE in sw.js e "Versione N" in sorgenti/p2_body.html)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const leggi = (f) => readFileSync(join(radice, "sorgenti", f), "utf8");

const head = leggi("p1_head.html");
const body = leggi("p2_body.html");
const js = ["p3_data.js", "p4_gen.js", "p5_app.js"].map(leggi).join("\n");
const script = "<script>\n" + js + "\n</script>\n";
const meta = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n';
const pwa = '<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#cf4a26">\n<link rel="apple-touch-icon" href="icon-192.png">\n<link rel="icon" href="icon-192.png">\n';
const sw = '<script>if ("serviceWorker" in navigator && location.protocol.startsWith("http") && window.top === window.self) navigator.serviceWorker.register("sw.js").catch(() => {});</script>\n';
const doc = (extraHead, extraBody) => '<!doctype html>\n<html lang="it">\n<head>\n' + meta + extraHead + head + "</head>\n<body>" + body + script + extraBody + "</body>\n</html>\n";

writeFileSync(join(radice, "index.html"), doc(pwa, sw));
mkdirSync(join(radice, "costruito"), { recursive: true });
writeFileSync(join(radice, "costruito", "artifact.html"), head + body + script);
writeFileSync(join(homedir(), "Desktop", "Settimana nel piatto.html"), doc("", ""));
console.log("index.html, costruito/artifact.html, Desktop\\Settimana nel piatto.html");

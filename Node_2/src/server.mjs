import { createApp } from "./app.mjs";

const portText = process.env.PORT ?? "3000";
const port = Number(portText);
const host = process.env.HOST ?? "127.0.0.1";

if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be a whole number between 1 and 65535.");
    process.exit(1);
}

const server = createApp().listen(port, host, () => {
    console.log(`Task API running at http://${host}:${port}`);
    console.log("Press Ctrl+C to stop. Task data resets when the server restarts.");
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the other server or change PORT.`);
    } else {
        console.error("Unable to start the server:", error.message);
    }
    process.exitCode = 1;
});

function shutdown() {
    server.close((error) => {
        if (error) {
            console.error("Unable to close the server:", error.message);
            process.exitCode = 1;
        }
    });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

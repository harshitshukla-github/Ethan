import * as http from "node:http";

const server = http.createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");

    if (request.method === "GET" && request.url === "/students") {
        response.writeHead(200);
        response.end(JSON.stringify([{ id: 1, name: "Ethan" }]));
        return;
    }

    response.writeHead(404);
    response.end(JSON.stringify({ error: "Route not found" }));
});

server.on("error", (error) => {
    console.error("Server error:", error.message);
    process.exitCode = 1;
});

server.listen(3000, "127.0.0.1", () => {
    console.log("Server listening at http://127.0.0.1:3000");
});

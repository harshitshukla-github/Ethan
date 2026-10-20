import assert from "node:assert/strict";
import { once } from "node:events";
import { afterEach, beforeEach, test } from "node:test";
import { createApp } from "../src/app.mjs";

let server;
let baseUrl;

beforeEach(async () => {
    // Port 0 chooses a free port; every test gets fresh data.
    server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
    await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
    });
});

function request(path, method = "GET", body) {
    const options = { method };
    if (body !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }
    return fetch(`${baseUrl}${path}`, options);
}

test("root and health endpoints respond with JSON", async () => {
    const root = await request("/");
    assert.equal(root.status, 200);
    assert.match(root.headers.get("content-type"), /application\/json/);
    assert.equal((await root.json()).endpoints.list, "GET /tasks");

    const health = await request("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
});

test("lists tasks and reads one by ID", async () => {
    const list = await request("/tasks");
    assert.equal(list.status, 200);
    assert.equal((await list.json()).length, 2);

    const read = await request("/tasks/1");
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), { id: 1, title: "Learn Node.js" });
});

test("create, read, update, and delete a task without reusing its ID", async () => {
    const created = await request("/tasks", "POST", { title: "  Learn Express  " });
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("location"), "/tasks/3");
    assert.deepEqual(await created.json(), { id: 3, title: "Learn Express" });

    const read = await request("/tasks/3");
    assert.equal((await read.json()).title, "Learn Express");

    const updated = await request("/tasks/3", "PATCH", { title: "  Practice Express  " });
    assert.equal(updated.status, 200);
    assert.deepEqual(await updated.json(), { id: 3, title: "Practice Express" });

    const deleted = await request("/tasks/3", "DELETE");
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), "");

    const missing = await request("/tasks/3");
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).message, "Task not found");

    const next = await request("/tasks", "POST", { title: "Next task" });
    assert.equal((await next.json()).id, 4);
});

test("rejects invalid titles and unknown fields without changing stored tasks", async () => {
    const invalidBodies = [
        {}, { title: "" }, { title: "   " }, { title: 42 },
        { title: null }, { title: "x".repeat(201) },
        { title: "Hello", id: 99 }, [], null
    ];

    for (const [path, method] of [["/tasks", "POST"], ["/tasks/1", "PATCH"]]) {
        for (const body of invalidBodies) {
            const response = await request(path, method, body);
            assert.equal(response.status, 400, `${method}: ${JSON.stringify(body)}`);
            assert.equal(typeof (await response.json()).message, "string");
        }
    }

    const list = await request("/tasks");
    assert.deepEqual(await list.json(), [
        { id: 1, title: "Learn Node.js" },
        { id: 2, title: "Build a REST API" }
    ]);
});

test("rejects malformed and oversized JSON", async () => {
    const malformed = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"title":'
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { message: "Invalid JSON body" });

    const large = await request("/tasks", "POST", { title: "x".repeat(17000) });
    assert.equal(large.status, 413);
    assert.equal(typeof (await large.json()).message, "string");
});

test("requires the application/json content type for writes", async () => {
    const response = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "Learn Express"
    });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).message, "Send the request body as application/json");
});

test("validates IDs for read, update, and delete", async () => {
    for (const id of ["0", "-1", "1.5", "abc", "1abc", "9007199254740992"]) {
        for (const method of ["GET", "PATCH", "DELETE"]) {
            const body = method === "PATCH" ? { title: "Updated" } : undefined;
            const response = await request(`/tasks/${id}`, method, body);
            assert.equal(response.status, 400, `${method} /tasks/${id}`);
            assert.equal(typeof (await response.json()).message, "string");
        }
    }
});

test("returns JSON 404 errors for missing tasks and unknown endpoints", async () => {
    for (const method of ["GET", "PATCH", "DELETE"]) {
        const body = method === "PATCH" ? { title: "Updated" } : undefined;
        const response = await request("/tasks/999", method, body);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { message: "Task not found" });
    }

    const unknown = await request("/missing-endpoint");
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { message: "Endpoint not found" });
});

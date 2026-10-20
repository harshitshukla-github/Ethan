import express from "express";
import { createTaskRouter } from "./routes/task.routes.mjs";
import { createTaskStore } from "./store/task.store.mjs";
import { notFound, errorHandler } from "./middleware/errors.mjs";

// Keeping the app separate from the server makes it easy to test.
export function createApp() {
    const app = express();

    app.disable("x-powered-by");
    app.use(express.json({ limit: "16kb" }));

    app.get("/", (req, res) => {
        res.json({
            message: "Welcome to the Task REST API",
            endpoints: {
                health: "GET /health",
                list: "GET /tasks",
                read: "GET /tasks/:id",
                create: "POST /tasks",
                update: "PATCH /tasks/:id",
                delete: "DELETE /tasks/:id"
            }
        });
    });

    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });

    app.use("/tasks", createTaskRouter(createTaskStore()));

    // These belong after the routes.
    app.use(notFound);
    app.use(errorHandler);

    return app;
}

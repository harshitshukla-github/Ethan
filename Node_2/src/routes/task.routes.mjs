import { Router } from "express";
import { createTaskController } from "../controllers/task.controller.mjs";
import { validateTaskId, validateTitle } from "../middleware/validation.mjs";

export function createTaskRouter(store) {
    const router = Router();
    const controller = createTaskController(store);

    // Runs for routes that include an :id parameter.
    router.param("id", validateTaskId);

    router.get("/", controller.list);
    router.get("/:id", controller.get);
    router.post("/", validateTitle, controller.create);
    router.patch("/:id", validateTitle, controller.update);
    router.delete("/:id", controller.remove);

    return router;
}

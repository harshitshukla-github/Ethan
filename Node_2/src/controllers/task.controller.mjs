// Controllers translate HTTP requests into store operations and responses.
export function createTaskController(store) {
    return {
        list(req, res) {
            res.json(store.getAll());
        },

        get(req, res) {
            const task = store.getById(req.taskId);

            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            res.json(task);
        },

        create(req, res) {
            const task = store.create(req.validatedTitle);

            res.location(`/tasks/${task.id}`).status(201).json(task);
        },

        update(req, res) {
            const task = store.updateTitle(req.taskId, req.validatedTitle);

            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            res.json(task);
        },

        remove(req, res) {
            const removed = store.remove(req.taskId);

            if (!removed) {
                return res.status(404).json({ message: "Task not found" });
            }

            // A 204 response must not contain a body.
            res.status(204).send();
        }
    };
}

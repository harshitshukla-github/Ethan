// In-memory storage: each app starts with these two sample tasks.
// A future database implementation can replace this module.
export function createTaskStore() {
    const tasks = [
        { id: 1, title: "Learn Node.js" },
        { id: 2, title: "Build a REST API" }
    ];
    let nextId = 3;

    return {
        getAll() {
            return tasks.map(task => ({ ...task }));
        },

        getById(id) {
            const task = tasks.find(task => task.id === id);
            return task ? { ...task } : undefined;
        },

        create(title) {
            const task = { id: nextId++, title };
            tasks.push(task);
            return { ...task };
        },

        updateTitle(id, title) {
            const task = tasks.find(task => task.id === id);

            if (!task) {
                return undefined;
            }

            task.title = title;
            return { ...task };
        },

        remove(id) {
            const index = tasks.findIndex(task => task.id === id);

            if (index === -1) {
                return false;
            }

            tasks.splice(index, 1);
            return true;
        }
    };
}

export function validateTaskId(req, res, next, value) {
    const id = Number(value);

    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
        return res.status(400).json({
            message: "Task ID must be a positive safe integer"
        });
    }

    req.taskId = id;
    next();
}

export function validateTitle(req, res, next) {
    if (!req.is("application/json")) {
        return res.status(415).json({
            message: "Send the request body as application/json"
        });
    }

    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({
            message: "Request body must be a JSON object"
        });
    }

    // Reject misspelled fields and client-supplied IDs.
    if (Object.keys(body).some(key => key !== "title")) {
        return res.status(400).json({
            message: "Only the title field is accepted"
        });
    }

    if (typeof body.title !== "string" || body.title.trim() === "") {
        return res.status(400).json({
            message: "Title must be a non-empty string"
        });
    }

    const title = body.title.trim();

    if (title.length > 200) {
        return res.status(400).json({
            message: "Title must be 200 characters or fewer"
        });
    }

    req.validatedTitle = title;
    next();
}

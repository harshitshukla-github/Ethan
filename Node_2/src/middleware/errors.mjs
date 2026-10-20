export function notFound(req, res) {
    res.status(404).json({ message: "Endpoint not found" });
}

// Express identifies error middleware by its four parameters.
export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({ message: "JSON body must be 16 KB or smaller" });
    }

    if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
        return res.status(415).json({ message: "Unsupported request encoding" });
    }

    console.error(error);
    res.status(500).json({ message: "Internal server error" });
}

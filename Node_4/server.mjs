import express from "express";

const app = express();

// Read JSON sent by the frontend
app.use(express.json())

// Serve HTML, CSS and browser JavaScript from "public"
app.use(express.static("public"));

app.post("/api/greet", (req, res)=>{
    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim()){
        return res.status(400).json({
            message: "Please enter a name."
        });
    }

    res.json({
        message: `Hello, ${name.trim()}! Welcome to Express.`
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
/*
Express is a web framework for Node.js that makes building web servers and APIs easier. It helps you define routes, read incoming requests, and send responses. In this code snippet, we import the Express library and create an instance of an Express application. This instance will be used to define routes and handle incoming HTTP requests.
*/
import express from 'express';

const app = express();

const students = [
    {id: 1, name: "Anay", course:"Machine Learning"},
    {id: 2, name: "Ethan", course:"Web Development"},
    {id: 3, name: "Tanisha", course:"Deep Learning"},
];


// Parse incoming JSON requests 
app.use(express.json());

// HomePage 
app.get('/', (req, res) => {
  res.send('Welcome to the Express Server!');
});

// AboutPage 
app.get('/about', (req, res) => {
  res.send('This is the About Page.');
});

// Return student information
app.get("/students", (req, res) => {
    res.json(students);
});

app.get("/students/:id", (req, res) => {
    const studentId = parseInt(req.params.id);
    const student = students.find(s => s.id === studentId);
    if (student) {
        res.json(student);
    } else {
        res.status(404).json({ error: "Student not found" });
    }
});

app.post("/students", (req, res)=>{
    const { name, course } = req.body ?? {};

    if (typeof name !== "string" || !name.trim() ||
        typeof course !== "string" || !course.trim()) {
        return res.status(400).json({ error: "Name and course are required" });
    }

    const student = {
        id: Math.max(0, ...students.map(s => s.id)) + 1,
        name: name.trim(),
        course: course.trim()
    };

    students.push(student);
    res.status(201).json(student);
});

// Delete the first student matching an ID or name.
app.delete("/students/:idOrName", (req, res) => {
    const idOrName = req.params.idOrName.trim();
    const studentIndex = students.findIndex(s =>
        String(s.id) === idOrName ||
        s.name.toLowerCase() === idOrName.toLowerCase()
    );

    if (studentIndex === -1) {
        return res.status(404).json({ error: "Student not found" });
    }

    const [deletedStudent] = students.splice(studentIndex, 1);
    res.json({ message: "Student deleted", student: deletedStudent });
});

// For practise, add a GET /courses route that returns: ["Python", "JavaScript", "React"]
app.get("/courses", (req, res)=>{
    res.json(["Python", "JavaScript", "React"]);
})

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

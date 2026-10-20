import express from "express";

const app = express()
const PORT = 8001

// Read tthe incoming JSON request bodies
app.use(express.json())

// Temporary data: resets whenever the server restarts
let tasks = [
    {id: 1, title: "We are learning basics of Node JS"},
    {id:2, title:"Build a REST API"}
];

let nextId = 3;

// 1. READ all tasks
app.get("/ethan", (req, res)=>{
    res.json(tasks);
});

// 2. READ one task
app.get("/tasks/:id", (req, res)=>{
    
});


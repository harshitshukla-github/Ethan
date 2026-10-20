/* 
In Node.js, Input/Output (I/O) usually means:
• Output -> displaying information in the terminalm commonly with the console object
• Input -> receiving information from the user, commonly with readline or process.stdin.
*/
import readline from "node:readline/promises";

// 1. console log - General purpose output
console.log("LOG:", "Hello, Node.js!")
// 2. console error - Displays an error message
console.error("ERROR:", "Something went wrong!")
// 3. console warn - Displays a warning
console.warn("WARN:", "Warning: Low Memory!")
// 4. console info - Displays Infomation output
console.info("INFO:", "Server started successfully")
// 5. console debug - Used for debugging message
console.debug("DEBUG:","current value:", 34);
// 6. console table - Excellent for arrays and objects
const students = [
    {name:"David", "age":15, "score":92},
    {name:"Emma", "age":14, "score":88},
    {name:"John", "age":16, "score":95},
]
console.table(students)
// 7. console dir - Useful for inspecting objects
const student = {
    name: "David",
    marks: {
        math: 95,
        science: 90,
        codeyoung: {
            python: 94,
            java: 89
        }
    }
}
console.dir(student, {depth: 1});
// 8. console assert - Prints an error when a condition is false
let age = 15;
console.assert(age >= 18, "User must be 18 or older")
age = 20;
console.assert(age >= 20, "User must be 18 or older")
// console count - Countts how many times a particular label has been called.
console.count("apple");
console.count("apple");
console.count("banana");
console.count("apple");

console.countReset("apple"); 
console.count("apple");

// 9. console time() and console timeEnd() - Meausre execution time
console.time("loop")
for (let i = 0; i < 1_000_000; i++){
    // some work
}
console.timeEnd("loop");

// 10. console group() - Froup related output
console.group("Student");

console.log("Name: David");
console.group("Marks");
console.log("Math: 95");
console.log("Science: 90");
console.groupEnd()
console.groupEnd()

// 11. console trace() - Display the current stack trace
// Very useful when debugging function calls 
function first(){
    second();
}

function second(){
    console.trace("How did we get here?")
}

first();

// 12. console clear() - Attempts to clear the terminal
// console.clear()

/*
Standard Ouput `process.stdout.write`
• Node also let you write directly to stdout
• Unlike `console.log()` write() does'nt automattically adds a newline.
*/ 
process.stdout.write("Hello");
process.stdout.write(" World!");

process.stdout.write("\nHello");
process.stdout.write(" Ethan!");

/*
Standard Error `process.stderr.write`
*/ 
process.stderr.write("Error occurred!\n")

/*
User input with `readline`
*/
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/*
rl.question("What is your name?", (name)=>{
    console.log(`Hello, ${name}!`);
    rl.close();
})
*/
// Wait for the answer and store it at file scope for later use.
const username = await rl.question("What is your name? ");
rl.close();

console.log(`Hello, ${username}!`);
console.log("Nice to meet you", username);

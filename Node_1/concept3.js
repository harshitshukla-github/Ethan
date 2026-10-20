// File Operations in Node
import fs from "node:fs/promises";
import syncfs from "node:fs";

/*Asynchronous operations
Asynchronous operations are preferred because they do not block other JavaScript 
work. The promise-based API supports async and await.
*/

async function performWriteOperations() {
    try{
        // 1. Write 
        await fs.writeFile(
            "files/notes.txt", 
            "Learning Node.js file operations.\n", 
            "utf8"
        );
        console.log("File written successfully.")
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

async function performReadOperations() {
    try{
        // 1. Read
        const content = await fs.readFile(
            "files/notes.txt", 
            "utf8"
        );
        console.log("Original content:")
        console.log(content)
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

async function performAppendOperations() {
    try{
        // 1. Append
        const content = await fs.appendFile(
            "files/notes.txt", 
            "This line was appended (added) later.\n",
            "utf8"
        );
        console.log("Content appended successfully!:");
        performReadOperations();
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

// performWriteOperations();
performReadOperations();
// performAppendOperations();

function syncPerformWriteOperations() {
    try{
        // 1. Write 
        syncfs.writeFileSync(
            "files/notes2.txt", 
            "Learning Node.js file operations in `sync` mode.\n", 
            "utf8"
        );
        console.log("Sync File written successfully.")
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

function syncPerformReadOperations() {
    try{
        // 1. Read
        const content = syncfs.readFileSync(
            "files/notes2.txt", 
            "utf8"
        );
        console.log("Original content:")
        console.log(content)
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

function syncPerformAppendOperations(){
    try{
        // 1. Append 
        syncfs.appendFileSync(
            "files/notes2.txt", 
            "Adding information about Node.js.\n", 
            "utf8"
        );
        console.log("Sync File append successfully.")
        syncPerformReadOperations();
    } catch (error){
        console.error("File operation failed:",  error.message);
    }
}

// syncPerformWriteOperations();
// syncPerformReadOperations();
syncPerformAppendOperations();
// Adding and Deleting Files and Directory (Folder)
import fs from "node:fs/promises";
import path from "node:path";

async function manageFiles() {
    const folderPath = "myFolder";
    const  filePath = path.join(folderPath, "notes.txt");

    try{
        // 1. Create a folder
        await fs.mkdir(folderPath, {recursive: true});
        console.log("Folder created successfully.");

        // 2. Create a file inside the folder
        await fs.writeFile(filePath, "Hello this is Ethan!", "utf8");
        console.log("File created successfully.");        
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

async function deleteFiles() {
    const folderPath = "myFolder";
    const  filePath = path.join(folderPath, "notes.txt");
    try{
        // 3. Delete the files
        await fs.unlink(filePath);
        console.log("File deleted successfully.");     
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

async function deleteEmptyDirectory() {
    const folderPath = "myFolder2";
    try{
        // 4. Delete the empty folder
        await fs.rmdir(folderPath);
        console.log("Folder deleted successfully.");   
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

async function deleteNonEmptyDirectory() {
    const folderPath = "myFolder2";
    try{
        // 5. Delete the non-empty folder
        await fs.rmdir(folderPath, {recursive:true, force:true});
        console.log("Folder deleted successfully.");   
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

async function renameItems() {
    const folderPath = "myFolder";
    const newFolderPath = "updatedFolder";
    const filePath = path.join(folderPath, "notes.txt");
    const newfilePath = path.join(folderPath, "updated_notes.txt")
    try{
        // 6. Rename a file
        // await fs.rename(filePath, newfilePath);
        // console.log("File named successfully.");

        // 7. Rename a folder
        await fs.rename(folderPath, newFolderPath);
        console.log("Folder name successfully updated!");
    } catch (error){
        console.error("Rename Failed:", error.message);
    }
}

// manageFiles();
// deleteFiles();
// deleteEmptyDirectory();
// deleteNonEmptyDirectory();
// renameItems();
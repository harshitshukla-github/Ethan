import fs from "node:fs";
import path from "node:path";


function createFiles() {
    const folderPath = "myFolder";
    const filePath = path.join(folderPath, "notes_sync.txt");

    try{
        // 1. Create a folder
        fs.mkdirSync(folderPath, {recursive: true});
        console.log("Folder created successfully.");

        // 2. Create a file inside the folder
        fs.writeFileSync(filePath, "Hello this is Ethan!", "utf8");
        console.log("File created successfully.");        
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

function deleteFiles() {
    const folderPath = "myFolder";
    const  filePath = path.join(folderPath, "notes_sync.txt");
    try{
        // 3. Delete the files
        fs.unlinkSync(filePath);
        console.log("File deleted successfully.");     
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

function deleteEmptyDirectory(){
    const folderPath = "emptyDirSync";
    try{
        // 3. Delete the Empty Directory
        fs.rmdirSync(folderPath);
        console.log("Folder deleted successfully.");     
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

function deleteNonEmptyDirectory(){
    const folderPath = "nonEmptyFolder";
    try{
        // 3. Delete the Empty Directory
        fs.rmSync(folderPath, {
            recursive: true,
            force: true
        });
        console.log("Folder deleted successfully.");     
    } catch (error){
        console.error("Operation Failed:", error.message);
    }
}

function renameItems(){
    const folderPath = "myOldFolder";
    const newFolderPath = "myNewFolder";
    const filePath = path.join(folderPath, "notes.txt");
    const newfilePath = path.join(folderPath, "updated_notes.txt");

    try{
        // 6. Rename a file
        // fs.renameSync(filePath, newfilePath);
        // console.log("File named successfully.");

        // 7. Rename a folder
        fs.renameSync(folderPath, newFolderPath);
        console.log("Folder name successfully updated!");
    } catch (error){
        console.error("Rename Failed:", error.message);
    }
}

function renameAndMoving(){
    const folderPath = "myNewFolder";
    const newFolderPath = "updatedFolder";
    const filePath = path.join(folderPath, "moving.txt");
    const newfilePath = path.join(newFolderPath, "moved.txt");

    try{
        // 8. Rename a file and Moving
        fs.renameSync(filePath, newfilePath);
        console.log("File named successfully.");
    } catch (error){
        console.error("Rename Failed:", error.message);
    }
}

// createFiles();
// deleteFiles();
// deleteEmptyDirectory();
// deleteNonEmptyDirectory();
// renameItems();
renameAndMoving();

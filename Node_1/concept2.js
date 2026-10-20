// Node treats `.js files` as ES Modules (ESM) so we use import/export rather than the traditional require()/module.exports.
// 1. Named import:- Import one specific function.
/*
import { add } from "./math.js";
console.log(add(10, 5));
*/

// 2. Import multiple name functions:- You can import several functions at once.
/*
import {add, subtract, multiply} from "./math.js";

console.log(add(10, 5));
console.log(subtract(10, 5));
console.log(multiply(10, 5));
*/

// 3. Rename a function while importing
/*
import { add as addition } from "./math.js";
console.log(addition(10, 5));
*/

// 4. Import Everything
// import * as math from "./math.js";
// console.log(math.add(10, 5));
// console.log(math.subtract(10, 5));
// console.log(math.multiply(10, 5));

// Defaul Exports - You dont't use {} for a default export
// There is only one default export per module
// 5. Import a default function - hat JS does'nt care about the local name because there is only one default export for that module
// import divide from "./math.js";
// console.log(divide(100, 25));

// 6. Default + named imports together
// import divide, {add, subtract, multiply} from "./math.js";
// console.log(add(20, 10));
// console.log(subtract(20, 10));
// console.log(multiply(20, 10));
// console.log(divide(20, 10));

// 7. Default + namespace import
// import divide, * as math from "./math.js";

// console.log(math.add(20, 10));
// console.log(math.subtract(20, 10));
// console.log(divide(20, 10));

// 8. Export functions separately, then import them 
import { square, cube } from "./math2.js";
console.log(square(10));
console.log(cube(15));

// 10. Dynamic import()
// Returns a promise
// const math = await import("./math.js");

// console.log(math.add(10, 5));
// console.log(math.subtract(10, 5));

// 11. Destructuring a dynamic import
const { default:divide, add, subtract} = await import("./math.js");
// const {default: divide} = await import("./math.js");
console.log(add(10, 5));
console.log(subtract(20, 10));
console.log(divide(100, 10));

//12. Importing from a package
import express from "express";
const app = express();

//13. Importing from a built-in Node Module
// import fs from "node:fs";
import { readFile, writeFile } from "node:fs";

// 14. Import only for side effects
// Sometimes we don't need anything from the module. We want its code to execute. This is known as side-effect import.
import "./setup.js";
console.log("Main Application");
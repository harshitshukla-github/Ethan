// http Module:- The http module in Node.js allow us to create web servers and make HTTP requests to other servers. 
/*
It has two main rules:
• Server: Receive a request from a browser or application and send a response.
• Client: Send a request to another server and read its response.
*/
import * as http from "node:http";

const request = http.get("http://127.0.0.1:3000/students", (response)=>{
    console.log("Status:", response.statusCode);

    response.setEncoding("utf8");

    let body = "";
    response.on("data", (chunk)=>{
        body += chunk;
    });
    response.on("end", ()=>{
        console.log("Response:", body);
    });
    response.on("error", (error)=>{
        console.log("Response Error:", error.message);
    })
});

request.on("error", (error)=>{
    console.error("Request error:", error.message);
});

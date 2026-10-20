export function add(a, b){
    return a + b;
}

export function subtract(a, b){
    return a - b;
}

export function multiply(a, b){
    return a * b;
}

export default function divide(a, b){
    try{
        return a/b
    }catch(error){
        console.log(error);
    }
}
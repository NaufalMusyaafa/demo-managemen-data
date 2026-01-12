const XLSX = require('xlsx');
// Axios removed 
// Wait, package.json for backend has body-parser, cors, etc but NOT axios.
// I will use `npm install axios` or just use `fetch` (if Node version supports it >= 18).
// User says OS is windows, time 2026. Node is likely recent. I'll use fetch.

// formData removed 
// Ah, `form-data` is not in root package.json.
// I will create the file manually using fs and just use a simple `curl` command OR write a script that uses only standard node libs or installed ones.
// I see `frontend` has axios. I cannot easily require `frontend/node_modules/axios` from `root`.
// I will write a script that generates the file, then outputs the CURL command to run.
// OR I check if I can use `node-fetch`.
// EASIEST: Generate .xlsx file, then use `curl` via `run_command` to upload it.

const fs = require('fs');
const path = require('path');

// 1. Generate Excel File
function generateExcel() {
    const data = [
        { Code: 'TEST001', Name: 'Test Product 1', Category: 'Test Cat', Price: 1000, Stock: 10 },
        { Code: 'TEST002', Name: 'Test Product 2', Category: 'Test Cat', Price: 2000, Stock: 20 }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    const filePath = path.join(__dirname, 'test_upload.xlsx');
    XLSX.writeFile(workbook, filePath);
    console.log(`Created test file: ${filePath}`);
    return filePath;
}

generateExcel();

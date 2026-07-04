const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'VapeTrax_Business_Lodhran (1).xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  
  const result = {
    sheets: []
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    // Get headers and up to 10 rows of data for a quick preview
    const rows = data.slice(0, 10);
    
    result.sheets.push({
      name: sheetName,
      rowCount: data.length,
      sampleData: rows
    });
  }
  
  fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
  console.log("Written to result.json");
} catch (err) {
  console.error("Error reading file:", err);
}

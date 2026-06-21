import "dotenv/config";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

async function main() {
  const filePath = path.resolve("Controle Repuxado.xlsx");
  console.log(`Lendo arquivo: ${filePath}`);

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  console.log(`Abas encontradas: ${workbook.SheetNames.join(", ")}`);

  workbook.SheetNames.forEach((sheetName) => {
    console.log(`\n------------------------------------------`);
    console.log(`Aba: ${sheetName}`);
    console.log(`------------------------------------------`);
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

    if (rows.length === 0) {
      console.log("Aba vazia.");
      return;
    }

    const headers = rows[0] as string[];
    console.log(`Cabeçalhos (${headers.length}):`, headers);

    console.log("\nPrimeiras 3 linhas de dados:");
    rows.slice(1, 4).forEach((row, idx) => {
      console.log(`Linha ${idx + 1}:`, row);
    });
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao ler planilha:", error);
    process.exit(1);
  });

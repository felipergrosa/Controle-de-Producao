import { spawn } from "child_process";

async function main() {
  console.log("[Auto-Push] Iniciando drizzle-kit push...");
  
  const child = spawn("npx", ["drizzle-kit", "push"], {
    stdio: ["pipe", "pipe", "inherit"],
    shell: true,
    cwd: process.cwd()
  });

  child.stdout.on("data", (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Se houver uma pergunta de prompt interativo
    if (output.includes("Is ") && output.includes("created or renamed")) {
      console.log("\n[Auto-Push] Detectada pergunta de tabela. Enviando Enter...");
      child.stdin.write("\r");
    } else if (output.includes("Do you want to truncate") || output.includes("You're about to add")) {
      console.log("\n[Auto-Push] Detectada pergunta de truncamento/constraint. Enviando Enter...");
      child.stdin.write("\r");
    }
  });

  child.on("close", (code) => {
    console.log(`[Auto-Push] Processo concluído com código: ${code}`);
    process.exit(code || 0);
  });
}

main().catch(console.error);

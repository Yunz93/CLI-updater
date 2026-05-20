import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function confirm(message) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

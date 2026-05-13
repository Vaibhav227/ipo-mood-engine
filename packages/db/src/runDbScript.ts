import { prisma } from "./client.js";

export async function runDbScript(main: () => Promise<void>) {
  try {
    await main();
    await Promise.race([
      prisma.$disconnect(),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 3000);
      })
    ]);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

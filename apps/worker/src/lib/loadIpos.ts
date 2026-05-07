import type { PrismaClient } from "@prisma/client";
import type { IpoMatchCandidate } from "../../../../packages/shared/src/types.js";

export async function loadIpoCandidates(prisma: PrismaClient): Promise<IpoMatchCandidate[]> {
  const ipos = await prisma.ipo.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      aliases: true
    }
  });

  return ipos;
}

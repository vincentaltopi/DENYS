import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "pierre@deloze.com";
  const password = "test1234";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Admin" },
  });

  console.log("User created:", email);
}

main().finally(() => prisma.$disconnect());

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Users ---
  const password = await bcrypt.hash("password123", 10);
  const oskarPwd = await bcrypt.hash("Oskar123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@company.com",
      passwordHash: password,
      role: Role.ADMIN,
    },
  });

  const jan = await prisma.user.upsert({
    where: { email: "jan@company.com" },
    update: {},
    create: {
      name: "Jan Kowalski",
      email: "jan@company.com",
      passwordHash: password,
      role: Role.USER,
    },
  });

  const anna = await prisma.user.upsert({
    where: { email: "anna@company.com" },
    update: {},
    create: {
      name: "Anna Nowak",
      email: "anna@company.com",
      passwordHash: password,
      role: Role.USER,
    },
  });

  const oskar = await prisma.user.upsert({
    where: { email: "oskar.tkaczyk@cursor.pl" },
    update: {},
    create: {
      name: "Oskar Tkaczyk",
      email: "oskar.tkaczyk@cursor.pl",
      passwordHash: oskarPwd,
      role: Role.USER,
    },
  });

  console.log("Users seeded:", { admin: admin.email, jan: jan.email, anna: anna.email });

  // --- Desks ---
  const desks = [
    // Dział Raportowy (2×4 = 8 biurek)
    { code: "A-01", name: "Biurko A-01", locationLabel: "Dział Raportowy" },
    { code: "A-02", name: "Biurko A-02", locationLabel: "Dział Raportowy" },
    { code: "A-03", name: "Biurko A-03", locationLabel: "Dział Raportowy" },
    { code: "A-04", name: "Biurko A-04", locationLabel: "Dział Raportowy" },
    { code: "B-01", name: "Biurko B-01", locationLabel: "Dział Raportowy" },
    { code: "B-02", name: "Biurko B-02", locationLabel: "Dział Raportowy" },
    { code: "C-01", name: "Biurko C-01", locationLabel: "Dział Raportowy" },
    { code: "C-02", name: "Biurko C-02", locationLabel: "Dział Raportowy" },
    // Open Space (1×3 = 3 biurka)
    { code: "O-01", name: "Biurko O-01", locationLabel: "Open Space" },
    { code: "O-02", name: "Biurko O-02", locationLabel: "Open Space" },
    { code: "O-03", name: "Biurko O-03", locationLabel: "Open Space" },
  ];

  for (const desk of desks) {
    await prisma.desk.upsert({
      where: { code: desk.code },
      update: { locationLabel: desk.locationLabel },
      create: desk,
    });
  }

  console.log(`Desks seeded: ${desks.length} desks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureOperator(data: {
  email: string;
  password: string;
  name: string;
  role: string;
  station?: string | null;
  pin?: string;
}) {
  const existing = await prisma.operator.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    console.log(`[seed] sudah ada: ${data.email}`);
    return;
  }
  await prisma.operator.create({
    data: {
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      pinHash: data.pin ? await bcrypt.hash(data.pin, 10) : null,
      name: data.name,
      role: data.role,
      station: data.station ?? null,
      active: true,
    },
  });
  console.log(
    `[seed] dibuat: ${data.email}${data.pin ? ` (PIN ${data.pin}, ${data.station})` : ""}`,
  );
}

async function main() {
  // Admin & operator demo
  await ensureOperator({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@afvs.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026",
    name: process.env.SEED_ADMIN_NAME ?? "Admin",
    role: "admin",
  });
  await ensureOperator({
    email: "operator@afvs.local",
    password: "operator123",
    name: "Operator Demo",
    role: "operator",
    station: "CGK-T3",
  });

  // Petugas AVSEC per titik pemeriksaan — login cepat via PIN.
  // 2 titik: SCP 2 (sebelum X-ray) & Lounge Bluesky.
  const avsecs = [
    { email: "avsec1@afvs.local", name: "Andi Saputra", station: "SCP2", pin: "1234" },
    { email: "avsec2@afvs.local", name: "Budi Santoso", station: "SCP2", pin: "2345" },
    { email: "avsec3@afvs.local", name: "Citra Lestari", station: "SCP2", pin: "3456" },
    { email: "avsec4@afvs.local", name: "Dewi Anggraini", station: "BLUESKY", pin: "4567" },
    { email: "avsec5@afvs.local", name: "Eko Prasetyo", station: "BLUESKY", pin: "5678" },
  ];
  for (const a of avsecs) {
    await ensureOperator({
      email: a.email,
      password: `pwd-${a.pin}-${a.station}`, // password panjang (login utama via PIN)
      name: a.name,
      role: "operator",
      station: a.station,
      pin: a.pin,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

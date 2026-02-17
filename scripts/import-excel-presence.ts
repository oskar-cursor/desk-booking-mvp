/**
 * SKRYPT IMPORTU DANYCH Z EXCELA DO BAZY DESK BOOKING
 * 
 * Ten skrypt:
 * 1. Czyta plik Excel z grafikiem (2026GrafikDzialRaportowyOEXreports.xlsx)
 * 2. Mapuje pracowników na konta w systemie (po emailu)
 * 3. Importuje dane presence (HOME/OFFICE/ABSENT) do bazy
 * 
 * PRZED URUCHOMIENIEM:
 * - Upewnij się, że wszyscy 16 pracowników mają konta w systemie
 * - Uzupełnij mapowanie imion na emaile poniżej
 * - Umieść plik Excel w katalogu projektu
 * 
 * URUCHOMIENIE:
 *   npx tsx scripts/import-excel-presence.ts
 */

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();

// ============================================================
// KONFIGURACJA — UZUPEŁNIJ EMAILE PRACOWNIKÓW
// ============================================================
// Klucz = imię z Excela (dokładnie jak w wierszu 1)
// Wartość = email w systemie Desk Booking
const EMPLOYEE_EMAIL_MAP: Record<string, string> = {
  "Krzysiek":                 "krzysiek@TWOJA_FIRMA.pl",
  "Tomasz":                   "tomasz@TWOJA_FIRMA.pl",
  "Joanna":                   "joanna@TWOJA_FIRMA.pl",
  "Marta":                    "marta@TWOJA_FIRMA.pl",
  "Mikołaj":                  "mikolaj@TWOJA_FIRMA.pl",
  "Adrian":                   "adrian@TWOJA_FIRMA.pl",
  "Kasia":                    "kasia@TWOJA_FIRMA.pl",
  "Hubert":                   "hubert@TWOJA_FIRMA.pl",
  "Kuba":                     "kuba@TWOJA_FIRMA.pl",
  "Jerzysław":                "jerzylaw@TWOJA_FIRMA.pl",
  "Michał B.":                "michal.b@TWOJA_FIRMA.pl",
  "Oskar":                    "oskar@TWOJA_FIRMA.pl",
  "Łukasz J vel Zygmunt":    "lukasz.j@TWOJA_FIRMA.pl",
  "Damian":                   "damian@TWOJA_FIRMA.pl",
  "Łukasz K":                 "lukasz.k@TWOJA_FIRMA.pl",
  "Mateusz":                  "mateusz@TWOJA_FIRMA.pl",
};

// ============================================================
// MAPOWANIE WARTOŚCI Z EXCELA NA TRYB PRACY
// ============================================================
const MODE_MAP: Record<string, "HOME" | "OFFICE" | "ABSENT" | null> = {
  "Office":       "OFFICE",
  "HO":           "HOME",
  "Urlop":        "ABSENT",
  "Nieobecny":    "ABSENT",
  "Szkolenie xD": "OFFICE",
  // Pomijane (null = nie importuj):
  "Święto":       null,
  "N/D":          null,
  "B/d":          null,
};

// ============================================================
// GŁÓWNA FUNKCJA IMPORTU
// ============================================================
async function importPresenceFromExcel() {
  const excelPath = path.resolve(process.cwd(), "2026GrafikDzialRaportowyOEXreports.xlsx");
  
  console.log("📂 Czytam plik Excel:", excelPath);
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets["Grafik"];
  
  if (!sheet) {
    throw new Error("Nie znaleziono arkusza 'Grafik' w pliku Excel");
  }

  // Parsuj arkusz do JSON
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Wiersz 0 = nagłówki (Dzień tyg, Data, Liczba, Krzysiek, Tomasz, ...)
  const headers = data[0] as string[];
  const employeeNames = headers.slice(3); // od kolumny D (indeks 3)
  
  console.log(`👥 Znaleziono ${employeeNames.length} pracowników:`, employeeNames.join(", "));

  // Pobierz użytkowników z bazy
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });
  
  // Zbuduj mapę: imię z Excela → userId
  const nameToUserId: Record<string, string> = {};
  const unmapped: string[] = [];
  
  for (const excelName of employeeNames) {
    const email = EMPLOYEE_EMAIL_MAP[excelName];
    if (!email) {
      unmapped.push(excelName);
      continue;
    }
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      unmapped.push(`${excelName} (email: ${email} — nie znaleziono w bazie)`);
      continue;
    }
    nameToUserId[excelName] = user.id;
  }

  if (unmapped.length > 0) {
    console.warn("⚠️  Nie zmapowani pracownicy:", unmapped.join(", "));
    console.warn("   Ich dane NIE zostaną zaimportowane.");
    console.warn("   Uzupełnij EMPLOYEE_EMAIL_MAP i upewnij się, że mają konta w systemie.\n");
  }

  // Przygotuj dane do importu
  const presenceRecords: Array<{
    userId: string;
    date: Date;
    mode: "HOME" | "OFFICE" | "ABSENT";
  }> = [];

  let skippedHoliday = 0;
  let skippedUnknown = 0;

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[1]) continue; // brak daty

    // Parsuj datę
    let dateValue: Date;
    if (typeof row[1] === "number") {
      // Excel serial date number
      dateValue = excelDateToJSDate(row[1]);
    } else if (row[1] instanceof Date) {
      dateValue = row[1];
    } else {
      continue; // nieprawidłowa data
    }

    const dateStr = formatDate(dateValue); // YYYY-MM-DD

    // Iteruj po pracownikach (kolumny od indeksu 3)
    for (let colIdx = 0; colIdx < employeeNames.length; colIdx++) {
      const excelName = employeeNames[colIdx];
      const userId = nameToUserId[excelName];
      if (!userId) continue; // nie zmapowany

      const cellValue = row[colIdx + 3];
      if (!cellValue || typeof cellValue !== "string") continue;

      const trimmed = cellValue.trim();
      const mode = MODE_MAP[trimmed];

      if (mode === undefined) {
        skippedUnknown++;
        console.warn(`⚠️  Nieznana wartość "${trimmed}" dla ${excelName} w dniu ${dateStr}`);
        continue;
      }

      if (mode === null) {
        skippedHoliday++;
        continue; // Święto, N/D, B/d — pomijamy
      }

      presenceRecords.push({
        userId,
        date: new Date(dateStr + "T00:00:00.000Z"),
        mode,
      });
    }
  }

  console.log(`\n📊 Podsumowanie parsowania:`);
  console.log(`   Rekordów do importu: ${presenceRecords.length}`);
  console.log(`   Pominiętych (Święto/N/D/B/d): ${skippedHoliday}`);
  console.log(`   Nieznanych wartości: ${skippedUnknown}`);

  // Zlicz per tryb
  const counts = { HOME: 0, OFFICE: 0, ABSENT: 0 };
  presenceRecords.forEach((r) => counts[r.mode]++);
  console.log(`   HOME: ${counts.HOME}, OFFICE: ${counts.OFFICE}, ABSENT: ${counts.ABSENT}`);

  // Import do bazy — batch upsert
  console.log(`\n🔄 Importuję do bazy danych...`);
  
  let imported = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < presenceRecords.length; i += BATCH_SIZE) {
    const batch = presenceRecords.slice(i, i + BATCH_SIZE);
    
    try {
      await prisma.$transaction(
        batch.map((record) =>
          prisma.presence.upsert({
            where: {
              userId_date: {
                userId: record.userId,
                date: record.date,
              },
            },
            update: {
              mode: record.mode,
            },
            create: {
              userId: record.userId,
              date: record.date,
              mode: record.mode,
            },
          })
        )
      );
      imported += batch.length;
    } catch (err) {
      errors += batch.length;
      console.error(`❌ Błąd przy batch ${i}-${i + batch.length}:`, err);
    }

    // Progress
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= presenceRecords.length) {
      console.log(`   Zaimportowano: ${imported}/${presenceRecords.length}`);
    }
  }

  console.log(`\n✅ Import zakończony!`);
  console.log(`   Zaimportowano: ${imported}`);
  console.log(`   Błędy: ${errors}`);
}

// ============================================================
// HELPERY
// ============================================================

function excelDateToJSDate(serial: number): Date {
  // Excel serial date to JS Date
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================================================
// URUCHOMIENIE
// ============================================================
importPresenceFromExcel()
  .catch((err) => {
    console.error("💥 Błąd krytyczny:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

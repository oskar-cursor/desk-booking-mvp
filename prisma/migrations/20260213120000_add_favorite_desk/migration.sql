-- AlterTable
ALTER TABLE "User" ADD COLUMN "favoriteDeskId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_favoriteDeskId_fkey" FOREIGN KEY ("favoriteDeskId") REFERENCES "Desk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

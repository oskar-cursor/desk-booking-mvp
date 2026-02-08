-- CreateEnum
CREATE TYPE "PresenceMode" AS ENUM ('HOME', 'OFFICE');

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mode" "PresenceMode" NOT NULL DEFAULT 'HOME',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presence_date_idx" ON "Presence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_userId_date_key" ON "Presence"("userId", "date");

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

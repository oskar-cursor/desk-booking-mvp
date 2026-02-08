-- CreateTable
CREATE TABLE "ParkingSpot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParkingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParkingReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParkingSpot_code_key" ON "ParkingSpot"("code");

-- CreateIndex
CREATE INDEX "ParkingReservation_date_idx" ON "ParkingReservation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingReservation_spotId_date_key" ON "ParkingReservation"("spotId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingReservation_userId_date_key" ON "ParkingReservation"("userId", "date");

-- AddForeignKey
ALTER TABLE "ParkingReservation" ADD CONSTRAINT "ParkingReservation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "ParkingSpot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingReservation" ADD CONSTRAINT "ParkingReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

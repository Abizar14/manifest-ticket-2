-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "station" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "airlineCode" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "std" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "station" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rawBarcode" TEXT NOT NULL,
    "flightNumber" TEXT,
    "pnr" TEXT,
    "ticketNumber" TEXT,
    "seat" TEXT,
    "passengerName" TEXT,
    "resultStatus" TEXT NOT NULL,
    "message" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "station" TEXT NOT NULL,
    "facePhotoPath" TEXT,
    "ktpStatus" TEXT,
    "ktpName" TEXT,
    "ktpSimilarity" DOUBLE PRECISION,
    "ktpCapturedAt" TIMESTAMP(3),
    "flightId" TEXT,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "Operator_station_idx" ON "Operator"("station");

-- CreateIndex
CREATE INDEX "Flight_station_std_idx" ON "Flight"("station", "std");

-- CreateIndex
CREATE INDEX "Flight_status_idx" ON "Flight"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_station_flightNumber_std_key" ON "Flight"("station", "flightNumber", "std");

-- CreateIndex
CREATE UNIQUE INDEX "ScanEvent_eventId_key" ON "ScanEvent"("eventId");

-- CreateIndex
CREATE INDEX "ScanEvent_station_scannedAt_idx" ON "ScanEvent"("station", "scannedAt");

-- CreateIndex
CREATE INDEX "ScanEvent_flightId_idx" ON "ScanEvent"("flightId");

-- CreateIndex
CREATE INDEX "ScanEvent_resultStatus_idx" ON "ScanEvent"("resultStatus");

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

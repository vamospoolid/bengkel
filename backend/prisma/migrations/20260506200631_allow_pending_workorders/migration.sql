-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_vehicleId_fkey";

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "partsUsed" JSONB,
ADD COLUMN     "plateNumber" TEXT,
ADD COLUMN     "services" TEXT[],
ALTER COLUMN "transactionId" DROP NOT NULL,
ALTER COLUMN "vehicleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

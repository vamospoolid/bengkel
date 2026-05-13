/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `odometer` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `priceNormal` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `paymentType` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CustomerCategory" AS ENUM ('UMUM', 'GROSIR', 'MITRA');

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "price",
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "compatibility" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "partNumber" TEXT,
ADD COLUMN     "priceGrosir" DOUBLE PRECISION,
ADD COLUMN     "priceMitra" DOUBLE PRECISION,
ADD COLUMN     "priceNormal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "odometer",
ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "paymentType" SET NOT NULL,
ALTER COLUMN "paymentType" SET DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'CASHIER';

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerCategory" NOT NULL DEFAULT 'UMUM',
    "phone" TEXT,
    "address" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentDebt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "changeQty" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "reference" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cashflow" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "userId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cashflow_referenceId_key" ON "Cashflow"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

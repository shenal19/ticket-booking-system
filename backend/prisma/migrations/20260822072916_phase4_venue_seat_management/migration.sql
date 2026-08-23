/*
  Warnings:

  - Added the required column `organiserId` to the `venues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "organiserId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "venues_organiserId_idx" ON "venues"("organiserId");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

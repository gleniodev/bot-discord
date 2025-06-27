/*
  Warnings:

  - You are about to drop the `ItemLimit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[itemSlug]` on the table `ItemAlias` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ItemAlias" ADD COLUMN     "quantidadeMax" INTEGER;

-- DropTable
DROP TABLE "ItemLimit";

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_itemSlug_key" ON "ItemAlias"("itemSlug");

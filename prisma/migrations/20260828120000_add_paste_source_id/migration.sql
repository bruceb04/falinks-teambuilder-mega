-- AlterTable
ALTER TABLE "Pokepaste" ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pokepaste_format_sourceId_key" ON "Pokepaste"("format", "sourceId");

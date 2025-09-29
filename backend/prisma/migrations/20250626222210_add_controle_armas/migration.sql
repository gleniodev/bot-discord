-- AlterTable
ALTER TABLE "ItemAlias" ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'GERAL';

-- CreateTable
CREATE TABLE "ControleArmas" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "dataHoraRetirada" TIMESTAMP(3) NOT NULL,
    "dataHoraDevolucao" TIMESTAMP(3),
    "cidade" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "statusArma" TEXT NOT NULL DEFAULT 'SEM_PERMISSAO',
    "motivoRetirada" TEXT,
    "superiOrAutorizador" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControleArmas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ControleArmas_nickname_idx" ON "ControleArmas"("nickname");

-- CreateIndex
CREATE INDEX "ControleArmas_statusArma_idx" ON "ControleArmas"("statusArma");

-- CreateIndex
CREATE INDEX "ControleArmas_dataHoraRetirada_idx" ON "ControleArmas"("dataHoraRetirada");

-- CreateIndex
CREATE INDEX "ControleArmas_itemSlug_idx" ON "ControleArmas"("itemSlug");

-- CreateIndex
CREATE INDEX "ControleArmas_patente_idx" ON "ControleArmas"("patente");

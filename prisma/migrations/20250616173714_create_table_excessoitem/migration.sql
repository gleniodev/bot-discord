-- CreateTable
CREATE TABLE "excesso_itens" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "quantidadeExcesso" INTEGER NOT NULL,
    "quantidadeDevolvida" INTEGER DEFAULT 0,
    "dataHoraRetirada" TIMESTAMP(3) NOT NULL,
    "dataHoraDevolucao" TIMESTAMP(3),
    "cidade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excesso_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLog" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "fixo" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLimit" (
    "id" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "quantidadeMax" INTEGER NOT NULL,

    CONSTRAINT "ItemLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAlias" (
    "id" SERIAL NOT NULL,
    "nomeDetectado" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,

    CONSTRAINT "ItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemLimit_itemSlug_key" ON "ItemLimit"("itemSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_nomeDetectado_key" ON "ItemAlias"("nomeDetectado");

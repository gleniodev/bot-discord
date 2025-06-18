import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limites de itens
  const limites = [
    { itemSlug: 'suco', quantidadeMax: 5 },
    { itemSlug: 'torta', quantidadeMax: 5 },
    { itemSlug: 'revivecavalo', quantidadeMax: 2 },
    { itemSlug: 'superboost', quantidadeMax: 12 },
    { itemSlug: 'seringamedica', quantidadeMax: 2 },
    { itemSlug: 'racoequina', quantidadeMax: 3 },
    { itemSlug: 'cafe', quantidadeMax: 3 },
    { itemSlug: 'bandagem', quantidadeMax: 3 },
    { itemSlug: 'gomatabaco', quantidadeMax: 5 },
    { itemSlug: 'cigarros', quantidadeMax: 4 },
    { itemSlug: 'gomas', quantidadeMax: 6 },
    { itemSlug: 'ammoshotgunnormal', quantidadeMax: 4 },
    { itemSlug: 'ammorepeaternormal', quantidadeMax: 5 },
    { itemSlug: 'ammoriflenormal', quantidadeMax: 5 },
    { itemSlug: 'ammorevolvernormal', quantidadeMax: 6 },
    { itemSlug: 'ammopistolnormal', quantidadeMax: 6 },
  ];

  for (const lim of limites) {
    await prisma.itemLimit.upsert({
      where: { itemSlug: lim.itemSlug },
      update: { quantidadeMax: lim.quantidadeMax },
      create: lim,
    });
  }

  // Aliases
  const aliases = [
    { nomeDetectado: 'sucodelemon', itemSlug: 'suco' },
    { nomeDetectado: 'sucodeuva', itemSlug: 'suco' },
    { nomeDetectado: 'saladadefruta', itemSlug: 'comida' },
    { nomeDetectado: 'tortademaca', itemSlug: 'comida' },
    { nomeDetectado: 'podecafe', itemSlug: 'cafe' },
    { nomeDetectado: 'ammorepeaternormal', itemSlug: 'ammorepeaternormal' },
    { nomeDetectado: 'ammorevolvernormal', itemSlug: 'ammorevolvernormal' },
    { nomeDetectado: 'ammoriflenormal', itemSlug: 'ammoriflenormal' },
    { nomeDetectado: 'ammopistolanormal', itemSlug: 'ammopistolanormal' },
    { nomeDetectado: 'ammoespingardanormal', itemSlug: 'ammoshotgunnormal' },
  ];

  for (const alias of aliases) {
    await prisma.itemAlias.upsert({
      where: { nomeDetectado: alias.nomeDetectado },
      update: { itemSlug: alias.itemSlug },
      create: alias,
    });
  }

  console.log('✅ Dados populados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

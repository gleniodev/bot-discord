import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando população da tabela ItemAlias...');

  // Mapeamento de itens com seus limites (CORRIGIDO)
  const itemsWithLimits = [
    // BEBIDAS (limite 5)
    { nomeDetectado: 'sucodelemon', itemSlug: 'sucodelemon', quantidadeMax: 5 },
    { nomeDetectado: 'sucodeuva', itemSlug: 'sucodeuva', quantidadeMax: 5 },
    { nomeDetectado: 'sucodecato', itemSlug: 'sucodecato', quantidadeMax: 5 },
    { nomeDetectado: 'cafe', itemSlug: 'cafe', quantidadeMax: 3 },
    {
      nomeDetectado: 'chocolatequente',
      itemSlug: 'chocolatequente',
      quantidadeMax: 5,
    },
    { nomeDetectado: 'tequilla', itemSlug: 'tequilla', quantidadeMax: 0 },
    { nomeDetectado: 'sangrita', itemSlug: 'sangrita', quantidadeMax: 0 },
    { nomeDetectado: 'purpledrunk', itemSlug: 'purpledrunk', quantidadeMax: 0 },
    { nomeDetectado: 'monshine2', itemSlug: 'monshine2', quantidadeMax: 0 },

    // COMIDAS (limite 5) - CORRIGIDO as strings vazias
    { nomeDetectado: 'tortademaca', itemSlug: 'tortademaca', quantidadeMax: 5 },
    {
      nomeDetectado: 'torta_cereja',
      itemSlug: 'torta_cereja',
      quantidadeMax: 5,
    },
    { nomeDetectado: 'chocolate', itemSlug: 'chocolate', quantidadeMax: 5 },
    { nomeDetectado: 'taco', itemSlug: 'taco', quantidadeMax: 5 },
    { nomeDetectado: 'paomofado', itemSlug: 'paomofado', quantidadeMax: 5 }, // CORRIGIDO: era ''
    {
      nomeDetectado: 'paocommatega',
      itemSlug: 'paocommatega',
      quantidadeMax: 5,
    },
    { nomeDetectado: 'docedragao', itemSlug: 'docedragao', quantidadeMax: 5 }, // CORRIGIDO: era ''
    { nomeDetectado: 'corn', itemSlug: 'corn', quantidadeMax: 5 }, // CORRIGIDO: era ''

    // MEDICAMENTOS/DROGAS (limite 2)
    { nomeDetectado: 'superboost', itemSlug: 'superboost', quantidadeMax: 12 },
    { nomeDetectado: 'tadalafila', itemSlug: 'tadalafila', quantidadeMax: 0 },
    { nomeDetectado: 'laudano2', itemSlug: 'laudano2', quantidadeMax: 0 },
    {
      nomeDetectado: 'oxidonitroso2',
      itemSlug: 'oxidonitroso2',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'nzt48', itemSlug: 'nzt48', quantidadeMax: 0 },
    { nomeDetectado: 'trembolona', itemSlug: 'trembolona', quantidadeMax: 0 },
    {
      nomeDetectado: 'remedioequino',
      itemSlug: 'remedioequino',
      quantidadeMax: 3,
    },
    { nomeDetectado: 'opio', itemSlug: 'opio', quantidadeMax: 0 },
    { nomeDetectado: 'opio2', itemSlug: 'opio2', quantidadeMax: 0 },
    { nomeDetectado: 'maconha', itemSlug: 'maconha', quantidadeMax: 0 },
    { nomeDetectado: 'cristal', itemSlug: 'cristal', quantidadeMax: 0 },

    // PLANTAS/ERVAS (limite 3)
    { nomeDetectado: 'podecobra', itemSlug: 'podecobra', quantidadeMax: 0 },
    {
      nomeDetectado: 'rubromiralis',
      itemSlug: 'rubromiralis',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'zimbro', itemSlug: 'zimbro', quantidadeMax: 0 },
    { nomeDetectado: 'beladona2', itemSlug: 'beladona2', quantidadeMax: 0 },
    { nomeDetectado: 'lacrima', itemSlug: 'lacrima', quantidadeMax: 0 },
    { nomeDetectado: 'arruda', itemSlug: 'arruda', quantidadeMax: 0 },
    {
      nomeDetectado: 'flordamaconha',
      itemSlug: 'flordamaconha',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'flordegladiolosroxo',
      itemSlug: 'flordegladiolosroxo',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'sementesdepapoularoxa',
      itemSlug: 'sementesdepapoularoxa',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'sementedroga1',
      itemSlug: 'sementedroga1',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'blood_flower_seed',
      itemSlug: 'blood_flower_seed',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'seda', itemSlug: 'seda', quantidadeMax: 0 },

    // TABACO/FUMO (limite 4)
    { nomeDetectado: 'tabac_brun', itemSlug: 'tabac_brun', quantidadeMax: 4 },
    {
      nomeDetectado: 'baladetabaco',
      itemSlug: 'baladetabaco',
      quantidadeMax: 4,
    },
    { nomeDetectado: 'fumonativo', itemSlug: 'fumonativo', quantidadeMax: 0 },
    { nomeDetectado: 'cigarett', itemSlug: 'cigarett', quantidadeMax: 4 },
    { nomeDetectado: 'pipe', itemSlug: 'pipe', quantidadeMax: 0 },

    // MUNIÇÕES (seguindo os limites dos itens em anexo)
    {
      nomeDetectado: 'ammoarrowdynamite',
      itemSlug: 'ammoarrowdynamite',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'ammoarrowfire',
      itemSlug: 'ammoarrowfire',
      quantidadeMax: 0,
    },

    // ARMAS (limite 0 - BLOQUEADAS)
    {
      nomeDetectado: 'weapon_pistol_semiauto',
      itemSlug: 'weapon_pistol_semiauto',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_revolver_cattleman',
      itemSlug: 'weapon_revolver_cattleman',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_repeater_henry',
      itemSlug: 'weapon_repeater_henry',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_pistol_mauser',
      itemSlug: 'weapon_pistol_mauser',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_pistol_m1899',
      itemSlug: 'weapon_pistol_m1899',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_shotgun_doublebarrel',
      itemSlug: 'weapon_shotgun_doublebarrel',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_repeater_evans',
      itemSlug: 'weapon_repeater_evans',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_repeater_winchester',
      itemSlug: 'weapon_repeater_winchester',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_repeater_carbine',
      itemSlug: 'weapon_repeater_carbine',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_rifle_boltaction',
      itemSlug: 'weapon_rifle_boltaction',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'weapon_bow', itemSlug: 'weapon_bow', quantidadeMax: 0 },
    {
      nomeDetectado: 'weapon_revolver_doubleaction',
      itemSlug: 'weapon_revolver_doubleaction',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_melee_torch',
      itemSlug: 'weapon_melee_torch',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_pistol_volcanic',
      itemSlug: 'weapon_pistol_volcanic',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_rifle_springfield',
      itemSlug: 'weapon_rifle_springfield',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_revolver_schofield',
      itemSlug: 'weapon_revolver_schofield',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_revolver_cattleman_mexican',
      itemSlug: 'weapon_revolver_cattleman_mexican',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_melee_hatchet_hunter',
      itemSlug: 'weapon_melee_hatchet_hunter',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_bow_improved',
      itemSlug: 'weapon_bow_improved',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_revolver_lemat',
      itemSlug: 'weapon_revolver_lemat',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_melee_knife',
      itemSlug: 'weapon_melee_knife',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'weapon_lasso',
      itemSlug: 'weapon_lasso',
      quantidadeMax: 0,
    },

    // ITENS SEM CATEGORIA ESPECÍFICA (limite 0)
    { nomeDetectado: 'handcuffkey', itemSlug: 'handcuffkey', quantidadeMax: 0 },
    { nomeDetectado: 'handcuffs', itemSlug: 'handcuffs', quantidadeMax: 0 },
    {
      nomeDetectado: 'moedadeguarma',
      itemSlug: 'moedadeguarma',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'segurorua', itemSlug: 'segurorua', quantidadeMax: 0 },
    { nomeDetectado: 'dentedeouro', itemSlug: 'dentedeouro', quantidadeMax: 0 },
    {
      nomeDetectado: 'titulobancodeguarma2',
      itemSlug: 'titulobancodeguarma2',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'tituloferroviario2',
      itemSlug: 'tituloferroviario2',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'lockpick', itemSlug: 'lockpick', quantidadeMax: 0 },
    { nomeDetectado: 'capuzninja', itemSlug: 'capuzninja', quantidadeMax: 0 },
    { nomeDetectado: 'biggame', itemSlug: 'biggame', quantidadeMax: 0 },
    { nomeDetectado: 'bookcraft2', itemSlug: 'bookcraft2', quantidadeMax: 0 },
    { nomeDetectado: 'man_idcard', itemSlug: 'man_idcard', quantidadeMax: 0 },
    { nomeDetectado: 'hatchet', itemSlug: 'hatchet', quantidadeMax: 0 },
    {
      nomeDetectado: 'titulodebanco',
      itemSlug: 'titulodebanco',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'dentedeouro2',
      itemSlug: 'dentedeouro2',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'aneldecasamento',
      itemSlug: 'aneldecasamento',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'relogioroubado',
      itemSlug: 'relogioroubado',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'hatchet2', itemSlug: 'hatchet2', quantidadeMax: 0 },
    {
      nomeDetectado: 'sangue_de_lobo',
      itemSlug: 'sangue_de_lobo',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'wolftooth', itemSlug: 'wolftooth', quantidadeMax: 0 },
    { nomeDetectado: 'wolfpelt', itemSlug: 'wolfpelt', quantidadeMax: 0 },
    { nomeDetectado: 'printphoto', itemSlug: 'printphoto', quantidadeMax: 0 },
    {
      nomeDetectado: 'titulodeferacaoguarma',
      itemSlug: 'titulodeferacaoguarma',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'outfit', itemSlug: 'outfit', quantidadeMax: 0 },
    { nomeDetectado: 'lencodeseda', itemSlug: 'lencodeseda', quantidadeMax: 0 },
    { nomeDetectado: 'placadearma', itemSlug: 'placadearma', quantidadeMax: 0 },
    {
      nomeDetectado: 'paninhodearma',
      itemSlug: 'paninhodearma',
      quantidadeMax: 0,
    },
    { nomeDetectado: 'wash', itemSlug: 'wash', quantidadeMax: 0 },
    { nomeDetectado: 'hoe', itemSlug: 'hoe', quantidadeMax: 0 },
    { nomeDetectado: 'satchel', itemSlug: 'satchel', quantidadeMax: 0 },
    {
      nomeDetectado: 'livrodereceitas2',
      itemSlug: 'livrodereceitas2',
      quantidadeMax: 0,
    },

    // ALIASES ORIGINAIS (mantendo compatibilidade)
    {
      nomeDetectado: 'serigaequina',
      itemSlug: 'serigaequina',
      quantidadeMax: 2,
    },
    { nomeDetectado: 'seryga', itemSlug: 'seryga', quantidadeMax: 2 },
    {
      nomeDetectado: 'seringamedica',
      itemSlug: 'seringamedica',
      quantidadeMax: 2,
    },
    { nomeDetectado: 'racoequina', itemSlug: 'racoequina', quantidadeMax: 3 },
    { nomeDetectado: 'bandage', itemSlug: 'bandage', quantidadeMax: 3 },
    { nomeDetectado: 'gomatabaco', itemSlug: 'gomatabaco', quantidadeMax: 5 },
    { nomeDetectado: 'cigarret', itemSlug: 'cigarret', quantidadeMax: 4 },
    {
      nomeDetectado: 'gomadeguarana',
      itemSlug: 'gomadeguarana',
      quantidadeMax: 6,
    },
    {
      nomeDetectado: 'ammoshotgunnormal',
      itemSlug: 'ammoshotgunnormal',
      quantidadeMax: 4,
    },
    {
      nomeDetectado: 'ammorepeaternormal',
      itemSlug: 'ammorepeaternormal',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'ammoriflenormal',
      itemSlug: 'ammoriflenormal',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'ammorevolvernormal',
      itemSlug: 'ammorevolvernormal',
      quantidadeMax: 6,
    },
    {
      nomeDetectado: 'ammopistolnormal',
      itemSlug: 'ammopistolnormal',
      quantidadeMax: 6,
    },
    {
      nomeDetectado: 'saladadefruta',
      itemSlug: 'saladadefruta',
      quantidadeMax: 5,
    },
    { nomeDetectado: 'podecafe', itemSlug: 'podecafe', quantidadeMax: 3 },
    {
      nomeDetectado: 'ammopistolanormal',
      itemSlug: 'ammopistolanormal',
      quantidadeMax: 6,
    },
    {
      nomeDetectado: 'ammoespingardanormal',
      itemSlug: 'ammoespingardanormal',
      quantidadeMax: 4,
    },

    // OUTROS FALTANTES

    {
      nomeDetectado: 'bandage',
      itemSlug: 'bandage',
      quantidadeMax: 3,
    },
    {
      nomeDetectado: 'batatarecheada',
      itemSlug: 'batatarecheada',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'coxinhadefrango',
      itemSlug: 'coxinhadefrango',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'frangocaipira',
      itemSlug: 'frangocaipira',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'lingotedeouro',
      itemSlug: 'lingotedeouro',
      quantidadeMax: 0,
    },
    {
      nomeDetectado: 'racaoequina',
      itemSlug: 'racaoequina',
      quantidadeMax: 3,
    },
    {
      nomeDetectado: 'refeicaocowboy',
      itemSlug: 'refeicaocowboy',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'sucodeamora',
      itemSlug: 'sucodeamora',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'sucodepeach',
      itemSlug: 'sucodepeach',
      quantidadeMax: 5,
    },
    {
      nomeDetectado: 'syringe',
      itemSlug: 'syringe',
      quantidadeMax: 2,
    },
    {
      nomeDetectado: 'tortaamora',
      itemSlug: 'tortaamora',
      quantidadeMax: 5,
    },
  ];

  let contador = 0;
  let erros = 0;

  for (const item of itemsWithLimits) {
    try {
      const resultado = await prisma.itemAlias.upsert({
        where: { nomeDetectado: item.nomeDetectado },
        update: {
          itemSlug: item.itemSlug,
          quantidadeMax: item.quantidadeMax,
        },
        create: item,
      });

      contador++;
      console.log(
        `✅ ${contador}: ${item.nomeDetectado} -> quantidadeMax: ${item.quantidadeMax}`,
      );
    } catch (error) {
      erros++;
      console.error(
        `❌ Erro ao processar item ${item.nomeDetectado}:`,
        error.message,
      );

      // Log específico para conflitos
      if (error.code === 'P2002') {
        console.error(
          `🔄 Conflito de unique constraint: ${error.meta?.target}`,
        );
      }
    }
  }

  console.log(`\n📊 RESUMO:`);
  console.log(`✅ Processados com sucesso: ${contador}`);
  console.log(`❌ Erros: ${erros}`);
  console.log(`📋 Total: ${itemsWithLimits.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco encerrada.');
  });

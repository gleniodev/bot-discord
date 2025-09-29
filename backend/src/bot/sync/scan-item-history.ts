// import { NestFactory } from '@nestjs/core';
// import { AppModule } from '../../app.module';
// import { BotService } from '../bot.service';
// import { PrismaService } from '../../../prisma/prisma.service';
// import { TextChannel, Collection, Message } from 'discord.js';

// class ItemHistoryScanner {
//   private readonly canaisDeLog = [
//     { id: '1357081317623201944', city: 'Valentine' },
//     { id: '1361184008536326254', city: 'Tumbleweed' },
//     { id: '1361183486760976464', city: 'Strawberry' },
//     { id: '1361183042395439134', city: 'Annes' },
//     { id: '1361183181482492105', city: 'Saint Denis' },
//     { id: '1361183597045747853', city: 'Black Water' },
//     { id: '1361183853749993472', city: 'Armadillo' },
//     { id: '1368654877063909377', city: 'Rhodes' },
//   ];

//   private itensUnicos = new Set<string>();

//   constructor(
//     private readonly botService: BotService,
//     private readonly prisma: PrismaService,
//   ) {}

//   private limpar(valor: string): string {
//     const resultado =
//       valor
//         ?.replace(/```/g, '')
//         ?.replace(/`/g, '')
//         ?.replace(/\n/g, '')
//         ?.replace(/\u200B/g, '')
//         ?.replace(/prolog/gi, '')
//         ?.replace(/fixo:/gi, '')
//         ?.trim() || '';

//     console.log(`🧹 LIMPEZA: "${valor}" -> "${resultado}"`);
//     return resultado;
//   }

//   private extrairNomeItem(nomeItem: string): string {
//     const matchItem = nomeItem.match(/(.+?)\s*x(\d+)/i);
//     const resultado = matchItem?.[1]?.trim() || nomeItem.trim();
//     console.log(`📦 EXTRAÇÃO: "${nomeItem}" -> "${resultado}"`);
//     return resultado;
//   }

//   private analisarTextoParaItens(texto: string, origem: string): void {
//     if (!texto || texto.trim().length === 0) return;

//     console.log(`    🔍 [${origem}] Analisando texto: "${texto}"`);

//     // Padrões comuns para identificar itens
//     const padroes = [
//       // Padrão com quantidade: "itemname x5", "item name x 10"
//       /(.+?)\s*x\s*(\d+)/gi,
//       // Padrão simples: palavras que podem ser itens
//       /\b([a-zA-Z0-9áéíóúàèìòùâêîôûãõç]+(?:\s+[a-zA-Z0-9áéíóúàèìòùâêîôûãõç]+)*)\b/g,
//     ];

//     let encontrouAlgo = false;

//     padroes.forEach((padrao, index) => {
//       const matches = [...texto.matchAll(padrao)];
//       if (matches.length > 0) {
//         console.log(
//           `    ✅ [${origem}] Padrão ${index + 1} encontrou ${matches.length} match(es)`,
//         );
//         encontrouAlgo = true;

//         matches.forEach((match, matchIndex) => {
//           let itemNome = '';
//           let quantidade = '1';

//           if (index === 0) {
//             // Padrão com quantidade
//             itemNome = match[1]?.trim() || '';
//             quantidade = match[2] || '1';
//           } else {
//             // Padrão simples
//             itemNome = match[1]?.trim() || '';
//           }

//           if (itemNome && itemNome.length > 2) {
//             // Pelo menos 3 caracteres
//             const itemLimpo = this.limpar(itemNome);
//             console.log(
//               `    📦 [${origem}] Match ${matchIndex + 1}: "${itemNome}" -> "${itemLimpo}" (x${quantidade})`,
//             );

//             if (itemLimpo && itemLimpo.length > 2) {
//               const itemKey = itemLimpo.toLowerCase();
//               const jaExiste = this.itensUnicos.has(itemKey);

//               if (!jaExiste) {
//                 this.itensUnicos.add(itemKey);
//                 console.log(
//                   `    ✅ [${origem}] NOVO ITEM ADICIONADO: "${itemLimpo}"`,
//                 );
//                 console.log(
//                   `    📊 Total de itens únicos: ${this.itensUnicos.size}`,
//                 );
//               } else {
//                 console.log(
//                   `    ⚠️ [${origem}] Item já existe: "${itemLimpo}"`,
//                 );
//               }
//             }
//           }
//         });
//       }
//     });

//     if (!encontrouAlgo) {
//       console.log(`    ❌ [${origem}] Nenhum padrão de item encontrado`);
//     }
//   }

//   async varrerHistoricoCanal(
//     canal: TextChannel,
//     cityName: string,
//   ): Promise<void> {
//     console.log(`\n🔍 ====== INICIANDO VARREDURA: ${cityName} ======`);
//     console.log(`📍 Canal ID: ${canal.id}`);
//     console.log(`📍 Canal Nome: ${canal.name}`);

//     // Limitar a apenas 10 mensagens para debug
//     const LIMITE_MENSAGENS = 100;

//     try {
//       console.log(`📥 Buscando últimas ${LIMITE_MENSAGENS} mensagens...`);

//       const mensagens = await canal.messages.fetch({ limit: LIMITE_MENSAGENS });

//       console.log(`📊 Mensagens encontradas: ${mensagens.size}`);

//       if (mensagens.size === 0) {
//         console.log(`❌ Nenhuma mensagem encontrada no canal ${cityName}`);
//         return;
//       }

//       let mensagemIndex = 0;
//       mensagens.forEach((message: any) => {
//         mensagemIndex++;
//         console.log(`\n--- MENSAGEM ${mensagemIndex}/${mensagens.size} ---`);
//         console.log(
//           `📅 Data: ${new Date(message.createdTimestamp).toLocaleString('pt-BR')}`,
//         );
//         console.log(
//           `👤 Autor: ${message.author?.username || 'Desconhecido'} (Bot: ${message.author?.bot})`,
//         );
//         console.log(`📝 Conteúdo: "${message.content}"`);
//         console.log(`📎 Embeds: ${message.embeds?.length || 0}`);

//         // MUDANÇA: Não ignora bots, pois os logs de itens são enviados por bots
//         console.log(
//           `🤖 Mensagem de bot: ${message.author?.bot ? 'SIM' : 'NÃO'}`,
//         );
//         if (message.author?.bot) {
//           console.log(
//             `🤖 Processando mensagem do bot: ${message.author?.username}`,
//           );
//         }

//         // Verifica se tem embeds (IGUAL AO CÓDIGO QUE FUNCIONA)
//         if (!message.embeds || message.embeds.length === 0) {
//           console.log(`📎 IGNORADO: Sem embeds`);
//           return;
//         }

//         console.log(`📎 Processando ${message.embeds.length} embed(s)...`);

//         const embed = message.embeds[0]; // Pega apenas o primeiro embed (como o código que funciona)

//         console.log(`\n  --- EMBED PRINCIPAL ---`);
//         console.log(`  📋 Título: "${embed.title || 'Sem título'}"`);
//         console.log(
//           `  📝 Descrição: "${embed.description || 'Sem descrição'}"`,
//         );
//         console.log(`  🏷️ Fields: ${embed.fields?.length || 0}`);

//         if (!embed.fields || embed.fields.length === 0) {
//           console.log(`  🏷️ IGNORADO: Embed sem campos`);
//           return;
//         }

//         console.log(`📋 Embed com ${embed.fields.length} campos`);

//         // CÓDIGO IDÊNTICO AO QUE FUNCIONA
//         const itemField = embed.fields.find((field) =>
//           ['item removido', 'item adicionado'].some((termo) =>
//             field.name.toLowerCase().includes(termo),
//           ),
//         );

//         if (!itemField) {
//           console.log(`❌ Campo de item não encontrado`);

//           // DEBUG: Mostra todos os campos para análise
//           console.log(`🔍 CAMPOS DISPONÍVEIS PARA DEBUG:`);
//           embed.fields.forEach((field: any, index: number) => {
//             console.log(`  Campo ${index + 1}:`);
//             console.log(`    Nome: "${field.name}"`);
//             console.log(`    Nome lowercase: "${field.name.toLowerCase()}"`);
//             console.log(`    Valor: "${field.value}"`);
//             console.log(
//               `    Contém "item removido": ${field.name.toLowerCase().includes('item removido')}`,
//             );
//             console.log(
//               `    Contém "item adicionado": ${field.name.toLowerCase().includes('item adicionado')}`,
//             );
//           });
//           return;
//         }

//         console.log(`✅ CAMPO DE ITEM ENCONTRADO!`);
//         console.log(`    🏷️ Nome do campo: "${itemField.name}"`);
//         console.log(`    📄 Valor do campo: "${itemField.value}"`);

//         const nomeItem = itemField.value || '';
//         const acao = this.limpar(itemField.name).replace(/:/g, '');

//         console.log(`    🧹 Ação limpa: "${acao}"`);
//         console.log(`    📦 Nome do item bruto: "${nomeItem}"`);

//         // Extrai e limpa o nome do item
//         const nomeItemLimpo = this.limpar(nomeItem);
//         console.log(`    🧹 Nome do item limpo: "${nomeItemLimpo}"`);

//         // Usa a regex para extrair item e quantidade
//         const matchItem = nomeItemLimpo.match(/(.+?)\s*x(\d+)/i);
//         const nomeItemFinal = matchItem?.[1]?.trim() || nomeItemLimpo.trim();
//         const quantidade = matchItem?.[2] || '1';

//         console.log(`    🔍 Regex match: ${matchItem ? 'SIM' : 'NÃO'}`);
//         console.log(`    📦 Nome final do item: "${nomeItemFinal}"`);
//         console.log(`    🔢 Quantidade: ${quantidade}`);

//         if (nomeItemFinal && nomeItemFinal.length > 0) {
//           const itemKey = nomeItemFinal.toLowerCase();
//           const jaExiste = this.itensUnicos.has(itemKey);

//           console.log(`    📚 Item já existe no set? ${jaExiste}`);

//           if (!jaExiste) {
//             this.itensUnicos.add(itemKey);
//             console.log(`    ✅ ITEM ADICIONADO AO SET: "${nomeItemFinal}"`);
//             console.log(
//               `    📊 Total de itens únicos agora: ${this.itensUnicos.size}`,
//             );
//           } else {
//             console.log(`    ⚠️ Item duplicado ignorado: "${nomeItemFinal}"`);
//           }
//         } else {
//           console.log(`    ❌ Nome do item está vazio ou inválido`);
//         }
//       });

//       console.log(`\n✅ ${cityName} concluído:`);
//       console.log(`   📊 Mensagens processadas: ${mensagens.size}`);
//       console.log(
//         `   📦 Itens únicos encontrados neste canal: ${Array.from(this.itensUnicos).length}`,
//       );
//     } catch (error) {
//       console.error(`❌ Erro ao varrer ${cityName}:`, error);
//       console.error(`❌ Stack trace:`, error.stack);
//     }
//   }

//   async salvarItensNoBanco(): Promise<void> {
//     console.log(`\n💾 ====== SALVANDO NO BANCO ======`);
//     console.log(
//       `💾 Total de itens únicos para salvar: ${this.itensUnicos.size}`,
//     );

//     if (this.itensUnicos.size === 0) {
//       console.log(`⚠️ Nenhum item para salvar`);
//       return;
//     }

//     const itensArray = Array.from(this.itensUnicos);
//     console.log(`📋 Lista de itens:`, itensArray);

//     let salvos = 0;
//     let ignorados = 0;

//     for (const itemSlug of itensArray) {
//       try {
//         console.log(`\n🔍 Verificando item: "${itemSlug}"`);

//         // Verifica se já existe
//         const existe = await this.prisma.itemAlias.findUnique({
//           where: { nomeDetectado: itemSlug },
//         });

//         if (!existe) {
//           console.log(`✅ Item não existe, salvando...`);
//           await this.prisma.itemAlias.create({
//             data: {
//               nomeDetectado: itemSlug,
//               itemSlug: itemSlug,
//             },
//           });
//           salvos++;
//           console.log(`✅ Item salvo com sucesso: "${itemSlug}"`);
//         } else {
//           ignorados++;
//           console.log(`⚠️ Item já existe no banco: "${itemSlug}"`);
//         }
//       } catch (error) {
//         console.error(`❌ Erro ao salvar item "${itemSlug}":`, error);
//       }
//     }

//     console.log(`\n💾 Salvamento concluído:`);
//     console.log(`   ✅ Salvos: ${salvos}`);
//     console.log(`   ⚠️ Já existiam: ${ignorados}`);
//   }

//   async executar(): Promise<void> {
//     const client = this.botService.getClient();

//     console.log('\n🚀 ====== INICIANDO VARREDURA DE HISTÓRICO ======');
//     console.log(`📋 Canais a serem varridos: ${this.canaisDeLog.length}`);
//     console.log(`🔧 Modo DEBUG: Limitado a 10 mensagens por canal`);

//     for (const canalInfo of this.canaisDeLog) {
//       try {
//         console.log(
//           `\n🔍 Processando canal: ${canalInfo.city} (${canalInfo.id})`,
//         );

//         const canal = client.channels.cache.get(canalInfo.id);
//         console.log(`📡 Canal encontrado no cache: ${canal ? 'SIM' : 'NÃO'}`);

//         if (!canal) {
//           console.error(
//             `❌ Canal não encontrado: ${canalInfo.city} (${canalInfo.id})`,
//           );
//           continue;
//         }

//         console.log(`📋 Tipo do canal: ${canal.type}`);
//         console.log(`📝 É baseado em texto: ${canal.isTextBased()}`);

//         if (!canal.isTextBased()) {
//           console.error(`❌ Canal não é baseado em texto: ${canalInfo.city}`);
//           continue;
//         }

//         await this.varrerHistoricoCanal(canal as TextChannel, canalInfo.city);

//         // Pausa entre canais para não sobrecarregar
//         console.log(`⏸️ Pausando 2 segundos antes do próximo canal...`);
//         await new Promise((resolve) => setTimeout(resolve, 2000));
//       } catch (error) {
//         console.error(`❌ Erro ao processar canal ${canalInfo.city}:`, error);
//         console.error(`❌ Stack trace:`, error.stack);
//       }
//     }

//     console.log(`\n📊 ====== RESUMO FINAL ======`);
//     console.log(
//       `📦 Total de itens únicos encontrados: ${this.itensUnicos.size}`,
//     );
//     console.log(`📋 Lista completa de itens:`, Array.from(this.itensUnicos));
//     console.log(`🏙️ Canais processados: ${this.canaisDeLog.length}`);

//     // Salva todos os itens únicos encontrados
//     if (this.itensUnicos.size > 0) {
//       await this.salvarItensNoBanco();
//     } else {
//       console.log(`⚠️ Nenhum item encontrado para salvar`);
//     }

//     console.log('\n🏁 Varredura de histórico concluída!');
//   }
// }

// async function bootstrap() {
//   console.log('🟡 Iniciando contexto da aplicação Nest...');
//   const app = await NestFactory.createApplicationContext(AppModule);

//   console.log('🟢 Contexto iniciado. Buscando serviços...');

//   try {
//     const botService = app.get(BotService);
//     const prismaService = app.get(PrismaService);

//     if (!botService || !prismaService) {
//       console.error('❌ Serviços não foram encontrados.');
//       await app.close();
//       return;
//     }

//     console.log('🔵 Aguardando bot conectar ao Discord...');

//     // Aguardar o bot ficar pronto
//     await botService.waitForReady(60000); // 60 segundos

//     console.log('✅ Bot conectado! Iniciando varredura...');

//     // Criar scanner e executar
//     const scanner = new ItemHistoryScanner(botService, prismaService);
//     await scanner.executar();

//     console.log('✅ Varredura concluída com sucesso.');
//   } catch (error) {
//     console.error('❌ Erro durante a execução:', error);
//     console.error('❌ Stack trace completo:', error.stack);
//   } finally {
//     console.log('🔚 Encerrando a aplicação...');
//     await app.close();
//   }
// }

// bootstrap().catch(console.error);
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BotService } from '../bot.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  TextChannel,
  Collection,
  Message,
  FetchMessagesOptions,
} from 'discord.js';

class ItemHistoryScanner {
  private readonly canaisDeLog = [
    { id: '1357081317623201944', city: 'Valentine' },
    { id: '1361184008536326254', city: 'Tumbleweed' },
    { id: '1361183486760976464', city: 'Strawberry' },
    { id: '1361183042395439134', city: 'Annes' },
    { id: '1361183181482492105', city: 'Saint Denis' },
    { id: '1361183597045747853', city: 'Black Water' },
    { id: '1361183853749993472', city: 'Armadillo' },
    { id: '1368654877063909377', city: 'Rhodes' },
  ];

  private itensUnicos = new Set<string>();

  constructor(
    private readonly botService: BotService,
    private readonly prisma: PrismaService,
  ) {}

  private limpar(valor: string): string {
    const resultado =
      valor
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '')
        ?.replace(/prolog/gi, '')
        ?.replace(/fixo:/gi, '')
        ?.trim() || '';

    console.log(`🧹 LIMPEZA: "${valor}" -> "${resultado}"`);
    return resultado;
  }

  private extrairNomeItem(nomeItem: string): string {
    const matchItem = nomeItem.match(/(.+?)\s*x(\d+)/i);
    const resultado = matchItem?.[1]?.trim() || nomeItem.trim();
    console.log(`📦 EXTRAÇÃO: "${nomeItem}" -> "${resultado}"`);
    return resultado;
  }

  private analisarTextoParaItens(texto: string, origem: string): void {
    if (!texto || texto.trim().length === 0) return;

    console.log(`    🔍 [${origem}] Analisando texto: "${texto}"`);

    // Padrões comuns para identificar itens
    const padroes = [
      // Padrão com quantidade: "itemname x5", "item name x 10"
      /(.+?)\s*x\s*(\d+)/gi,
      // Padrão simples: palavras que podem ser itens
      /\b([a-zA-Z0-9áéíóúàèìòùâêîôûãõç]+(?:\s+[a-zA-Z0-9áéíóúàèìòùâêîôûãõç]+)*)\b/g,
    ];

    let encontrouAlgo = false;

    padroes.forEach((padrao, index) => {
      const matches = [...texto.matchAll(padrao)];
      if (matches.length > 0) {
        console.log(
          `    ✅ [${origem}] Padrão ${index + 1} encontrou ${matches.length} match(es)`,
        );
        encontrouAlgo = true;

        matches.forEach((match, matchIndex) => {
          let itemNome = '';
          let quantidade = '1';

          if (index === 0) {
            // Padrão com quantidade
            itemNome = match[1]?.trim() || '';
            quantidade = match[2] || '1';
          } else {
            // Padrão simples
            itemNome = match[1]?.trim() || '';
          }

          if (itemNome && itemNome.length > 2) {
            // Pelo menos 3 caracteres
            const itemLimpo = this.limpar(itemNome);
            console.log(
              `    📦 [${origem}] Match ${matchIndex + 1}: "${itemNome}" -> "${itemLimpo}" (x${quantidade})`,
            );

            if (itemLimpo && itemLimpo.length > 2) {
              const itemKey = itemLimpo.toLowerCase();
              const jaExiste = this.itensUnicos.has(itemKey);

              if (!jaExiste) {
                this.itensUnicos.add(itemKey);
                console.log(
                  `    ✅ [${origem}] NOVO ITEM ADICIONADO: "${itemLimpo}"`,
                );
                console.log(
                  `    📊 Total de itens únicos: ${this.itensUnicos.size}`,
                );
              } else {
                console.log(
                  `    ⚠️ [${origem}] Item já existe: "${itemLimpo}"`,
                );
              }
            }
          }
        });
      }
    });

    if (!encontrouAlgo) {
      console.log(`    ❌ [${origem}] Nenhum padrão de item encontrado`);
    }
  }

  async varrerHistoricoCanal(
    canal: TextChannel,
    cityName: string,
  ): Promise<void> {
    console.log(`\n🔍 ====== INICIANDO VARREDURA: ${cityName} ======`);
    console.log(`📍 Canal ID: ${canal.id}`);
    console.log(`📍 Canal Nome: ${canal.name}`);

    // Total de mensagens desejadas
    const LIMITE_MENSAGENS_TOTAL = 5000;
    // Limite por requisição (máximo da API do Discord)
    const LIMITE_POR_REQUISICAO = 100;
    // Pausa entre requisições para evitar rate limit
    const PAUSA_ENTRE_REQUISICOES = 1000; // 1 segundo

    try {
      console.log(
        `📥 Buscando ${LIMITE_MENSAGENS_TOTAL} mensagens em lotes de ${LIMITE_POR_REQUISICAO}...`,
      );

      const todasMensagens = new Collection<string, Message>();
      let ultimaMensagemId: string | undefined;
      let requisicoes = 0;
      const maxRequisicoes = Math.ceil(
        LIMITE_MENSAGENS_TOTAL / LIMITE_POR_REQUISICAO,
      );

      while (
        todasMensagens.size < LIMITE_MENSAGENS_TOTAL &&
        requisicoes < maxRequisicoes
      ) {
        requisicoes++;
        console.log(
          `📦 Requisição ${requisicoes}/${maxRequisicoes} - Buscando até ${LIMITE_POR_REQUISICAO} mensagens...`,
        );

        const options: FetchMessagesOptions = ultimaMensagemId
          ? { limit: LIMITE_POR_REQUISICAO, before: ultimaMensagemId }
          : { limit: LIMITE_POR_REQUISICAO };

        const lote = await canal.messages.fetch(options);
        console.log(`   ✅ Recebidas ${lote.size} mensagens neste lote`);

        if (lote.size === 0) {
          console.log(
            `   ⚠️ Nenhuma mensagem mais antiga encontrada. Parando busca.`,
          );
          break;
        }

        // Adiciona mensagens ao collection total
        lote.forEach((msg, id) => {
          if (todasMensagens.size < LIMITE_MENSAGENS_TOTAL) {
            todasMensagens.set(id, msg);
          }
        });

        // Pega o ID da mensagem mais antiga para a próxima requisição
        const mensagensArray = Array.from(lote.values());
        ultimaMensagemId = mensagensArray[mensagensArray.length - 1]?.id;

        console.log(`   📊 Total acumulado: ${todasMensagens.size} mensagens`);

        // Pausa entre requisições para respeitar rate limits
        if (
          requisicoes < maxRequisicoes &&
          todasMensagens.size < LIMITE_MENSAGENS_TOTAL
        ) {
          console.log(
            `   ⏸️ Pausando ${PAUSA_ENTRE_REQUISICOES}ms antes da próxima requisição...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, PAUSA_ENTRE_REQUISICOES),
          );
        }
      }

      console.log(`📊 Mensagens encontradas: ${todasMensagens.size}`);
      console.log(`📦 Requisições realizadas: ${requisicoes}`);

      if (todasMensagens.size === 0) {
        console.log(`❌ Nenhuma mensagem encontrada no canal ${cityName}`);
        return;
      }

      let mensagemIndex = 0;
      todasMensagens.forEach((message: any) => {
        mensagemIndex++;
        console.log(
          `\n--- MENSAGEM ${mensagemIndex}/${todasMensagens.size} ---`,
        );
        console.log(
          `📅 Data: ${new Date(message.createdTimestamp).toLocaleString('pt-BR')}`,
        );
        console.log(
          `👤 Autor: ${message.author?.username || 'Desconhecido'} (Bot: ${message.author?.bot})`,
        );
        console.log(`📝 Conteúdo: "${message.content}"`);
        console.log(`📎 Embeds: ${message.embeds?.length || 0}`);

        // MUDANÇA: Não ignora bots, pois os logs de itens são enviados por bots
        console.log(
          `🤖 Mensagem de bot: ${message.author?.bot ? 'SIM' : 'NÃO'}`,
        );
        if (message.author?.bot) {
          console.log(
            `🤖 Processando mensagem do bot: ${message.author?.username}`,
          );
        }

        // Verifica se tem embeds (IGUAL AO CÓDIGO QUE FUNCIONA)
        if (!message.embeds || message.embeds.length === 0) {
          console.log(`📎 IGNORADO: Sem embeds`);
          return;
        }

        console.log(`📎 Processando ${message.embeds.length} embed(s)...`);

        const embed = message.embeds[0]; // Pega apenas o primeiro embed (como o código que funciona)

        console.log(`\n  --- EMBED PRINCIPAL ---`);
        console.log(`  📋 Título: "${embed.title || 'Sem título'}"`);
        console.log(
          `  📝 Descrição: "${embed.description || 'Sem descrição'}"`,
        );
        console.log(`  🏷️ Fields: ${embed.fields?.length || 0}`);

        if (!embed.fields || embed.fields.length === 0) {
          console.log(`  🏷️ IGNORADO: Embed sem campos`);
          return;
        }

        console.log(`📋 Embed com ${embed.fields.length} campos`);

        // CÓDIGO IDÊNTICO AO QUE FUNCIONA
        const itemField = embed.fields.find((field) =>
          ['item removido', 'item adicionado'].some((termo) =>
            field.name.toLowerCase().includes(termo),
          ),
        );

        if (!itemField) {
          console.log(`❌ Campo de item não encontrado`);

          // DEBUG: Mostra todos os campos para análise
          console.log(`🔍 CAMPOS DISPONÍVEIS PARA DEBUG:`);
          embed.fields.forEach((field: any, index: number) => {
            console.log(`  Campo ${index + 1}:`);
            console.log(`    Nome: "${field.name}"`);
            console.log(`    Nome lowercase: "${field.name.toLowerCase()}"`);
            console.log(`    Valor: "${field.value}"`);
            console.log(
              `    Contém "item removido": ${field.name.toLowerCase().includes('item removido')}`,
            );
            console.log(
              `    Contém "item adicionado": ${field.name.toLowerCase().includes('item adicionado')}`,
            );
          });
          return;
        }

        console.log(`✅ CAMPO DE ITEM ENCONTRADO!`);
        console.log(`    🏷️ Nome do campo: "${itemField.name}"`);
        console.log(`    📄 Valor do campo: "${itemField.value}"`);

        const nomeItem = itemField.value || '';
        const acao = this.limpar(itemField.name).replace(/:/g, '');

        console.log(`    🧹 Ação limpa: "${acao}"`);
        console.log(`    📦 Nome do item bruto: "${nomeItem}"`);

        // Extrai e limpa o nome do item
        const nomeItemLimpo = this.limpar(nomeItem);
        console.log(`    🧹 Nome do item limpo: "${nomeItemLimpo}"`);

        // Usa a regex para extrair item e quantidade
        const matchItem = nomeItemLimpo.match(/(.+?)\s*x(\d+)/i);
        const nomeItemFinal = matchItem?.[1]?.trim() || nomeItemLimpo.trim();
        const quantidade = matchItem?.[2] || '1';

        console.log(`    🔍 Regex match: ${matchItem ? 'SIM' : 'NÃO'}`);
        console.log(`    📦 Nome final do item: "${nomeItemFinal}"`);
        console.log(`    🔢 Quantidade: ${quantidade}`);

        if (nomeItemFinal && nomeItemFinal.length > 0) {
          const itemKey = nomeItemFinal.toLowerCase();
          const jaExiste = this.itensUnicos.has(itemKey);

          console.log(`    📚 Item já existe no set? ${jaExiste}`);

          if (!jaExiste) {
            this.itensUnicos.add(itemKey);
            console.log(`    ✅ ITEM ADICIONADO AO SET: "${nomeItemFinal}"`);
            console.log(
              `    📊 Total de itens únicos agora: ${this.itensUnicos.size}`,
            );
          } else {
            console.log(`    ⚠️ Item duplicado ignorado: "${nomeItemFinal}"`);
          }
        } else {
          console.log(`    ❌ Nome do item está vazio ou inválido`);
        }
      });

      console.log(`\n✅ ${cityName} concluído:`);
      console.log(`   📊 Mensagens processadas: ${todasMensagens.size}`);
      console.log(
        `   📦 Itens únicos encontrados neste canal: ${Array.from(this.itensUnicos).length}`,
      );
    } catch (error) {
      console.error(`❌ Erro ao varrer ${cityName}:`, error);
      console.error(`❌ Stack trace:`, error.stack);
    }
  }

  async salvarItensNoBanco(): Promise<void> {
    console.log(`\n💾 ====== SALVANDO NO BANCO ======`);
    console.log(
      `💾 Total de itens únicos para salvar: ${this.itensUnicos.size}`,
    );

    if (this.itensUnicos.size === 0) {
      console.log(`⚠️ Nenhum item para salvar`);
      return;
    }

    const itensArray = Array.from(this.itensUnicos);
    console.log(`📋 Lista de itens:`, itensArray);

    let salvos = 0;
    let ignorados = 0;

    for (const itemSlug of itensArray) {
      try {
        console.log(`\n🔍 Verificando item: "${itemSlug}"`);

        // Verifica se já existe
        const existe = await this.prisma.itemAlias.findUnique({
          where: { nomeDetectado: itemSlug },
        });

        if (!existe) {
          console.log(`✅ Item não existe, salvando...`);
          await this.prisma.itemAlias.create({
            data: {
              nomeDetectado: itemSlug,
              itemSlug: itemSlug,
            },
          });
          salvos++;
          console.log(`✅ Item salvo com sucesso: "${itemSlug}"`);
        } else {
          ignorados++;
          console.log(`⚠️ Item já existe no banco: "${itemSlug}"`);
        }
      } catch (error) {
        console.error(`❌ Erro ao salvar item "${itemSlug}":`, error);
      }
    }

    console.log(`\n💾 Salvamento concluído:`);
    console.log(`   ✅ Salvos: ${salvos}`);
    console.log(`   ⚠️ Já existiam: ${ignorados}`);
  }

  async executar(): Promise<void> {
    const client = this.botService.getClient();

    console.log('\n🚀 ====== INICIANDO VARREDURA DE HISTÓRICO ======');
    console.log(`📋 Canais a serem varridos: ${this.canaisDeLog.length}`);
    console.log(`🔧 Modo PRODUÇÃO: 5000 mensagens por canal`);

    for (const canalInfo of this.canaisDeLog) {
      try {
        console.log(
          `\n🔍 Processando canal: ${canalInfo.city} (${canalInfo.id})`,
        );

        const canal = client.channels.cache.get(canalInfo.id);
        console.log(`📡 Canal encontrado no cache: ${canal ? 'SIM' : 'NÃO'}`);

        if (!canal) {
          console.error(
            `❌ Canal não encontrado: ${canalInfo.city} (${canalInfo.id})`,
          );
          continue;
        }

        console.log(`📋 Tipo do canal: ${canal.type}`);
        console.log(`📝 É baseado em texto: ${canal.isTextBased()}`);

        if (!canal.isTextBased()) {
          console.error(`❌ Canal não é baseado em texto: ${canalInfo.city}`);
          continue;
        }

        await this.varrerHistoricoCanal(canal as TextChannel, canalInfo.city);

        // Pausa entre canais para não sobrecarregar (aumentada devido ao maior volume)
        console.log(`⏸️ Pausando 5 segundos antes do próximo canal...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`❌ Erro ao processar canal ${canalInfo.city}:`, error);
        console.error(`❌ Stack trace:`, error.stack);
      }
    }

    console.log(`\n📊 ====== RESUMO FINAL ======`);
    console.log(
      `📦 Total de itens únicos encontrados: ${this.itensUnicos.size}`,
    );
    console.log(`📋 Lista completa de itens:`, Array.from(this.itensUnicos));
    console.log(`🏙️ Canais processados: ${this.canaisDeLog.length}`);

    // Salva todos os itens únicos encontrados
    if (this.itensUnicos.size > 0) {
      await this.salvarItensNoBanco();
    } else {
      console.log(`⚠️ Nenhum item encontrado para salvar`);
    }

    console.log('\n🏁 Varredura de histórico concluída!');
  }
}

async function bootstrap() {
  console.log('🟡 Iniciando contexto da aplicação Nest...');
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('🟢 Contexto iniciado. Buscando serviços...');

  try {
    const botService = app.get(BotService);
    const prismaService = app.get(PrismaService);

    if (!botService || !prismaService) {
      console.error('❌ Serviços não foram encontrados.');
      await app.close();
      return;
    }

    console.log('🔵 Aguardando bot conectar ao Discord...');

    // Aguardar o bot ficar pronto
    await botService.waitForReady(60000); // 60 segundos

    console.log('✅ Bot conectado! Iniciando varredura...');

    // Criar scanner e executar
    const scanner = new ItemHistoryScanner(botService, prismaService);
    await scanner.executar();

    console.log('✅ Varredura concluída com sucesso.');
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    console.error('❌ Stack trace completo:', error.stack);
  } finally {
    console.log('🔚 Encerrando a aplicação...');
    await app.close();
  }
}

bootstrap().catch(console.error);

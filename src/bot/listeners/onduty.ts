// CANAIS DE LOG COM EMBEDS ON DUTY
// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { BotService } from '../bot.service';

// @Injectable()
// export class MessageListener implements OnModuleInit {
//   constructor(private readonly botService: BotService) {}

//   onModuleInit() {
//     const client = this.botService.getClient();

//     client.on('messageCreate', (message) => {
//       if (message.author.id === client.user?.id) return;

//       if ('name' in message.channel && message.channel.name === 'onduty') {
//         const embed = message.embeds?.[0];

//         if (embed && embed.fields) {
//           const dados = {
//             nome:
//               embed.fields.find((f) => f.name.toLowerCase().includes('nome'))
//                 ?.value ?? 'n/a',
//             identificador:
//               embed.fields.find((f) =>
//                 f.name.toLowerCase().includes('identificador'),
//               )?.value ?? 'n/a',
//             acao:
//               embed.fields.find((f) => f.name.toLowerCase().includes('ação'))
//                 ?.value ?? 'n/a',
//             data:
//               embed.fields.find((f) => f.name.toLowerCase().includes('data'))
//                 ?.value ?? 'n/a',
//           };

//           console.log(`📥 Registro recebido em [onduty]:`);
//           console.log(dados);
//         } else {
//           console.log(`⚠️ Embed sem campos em [onduty]`);
//         }  else if ('name' in message.channel && message.channel.name === 'onduty')
//       }
//     });
//   }
// }

//_____________________________________________________________

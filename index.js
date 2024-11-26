const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const fetch = require("node-fetch");
const timestampToDate = require("timestamp-to-date");
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN);

const subscribersFileName = "subscribers.json";
const outSubscribersFileName = "outsubscribers.json";

const tsApiKey = process.env.TS_TOKEN;
const wallet = "TNFm9JdGoj58wnkos742obF8mN4Xcm5n6X";
const contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const outWallet = "TXhyDNCzdC5WMUfqtVbi9zwf7vgsMkMmKc";

const interval = 10;
const minAmount = 10000;
const minAmountLow = 3000;

let lastTransferId = "";
let lastTimeStamp = "";

let lastOutId = "";
let lastOutTimeStamp = "";

(async () => {
   while (true) {
      console.log("Последнее ID пополнения " + lastTransferId);
      console.log(
         `Последнее время пополнения ${
            lastTimeStamp &&
            timestampToDate(lastTimeStamp, "dd.MM.yyyy HH:mm:ss")
         }`
      );
      await fetch(
         `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=3&start=0&toAddress=${wallet}&contract_address=${contract_address}&start_timestamp=${lastTimeStamp}&end_timestamp=&confirm=&filterTokenValue=1`,
         {
            headers: {
               "TRON-PRO-API-KEY": tsApiKey,
            },
         }
      )
         .then((response) => response.json())
         .then(async (data) => {
            const transfers = data.token_transfers;

            if (lastTransferId !== "" && transfers.length > 0) {
               if (lastTransferId !== transfers[0].transaction_id) {
                  let newAmount = null;
                  await fetch(
                     `https://apilist.tronscanapi.com/api/accountv2?address=${wallet}`,
                     {
                        headers: {
                           "TRON-PRO-API-KEY": tsApiKey,
                        },
                     }
                  )
                     .then((response) => response.json())
                     .then(async (data) => {
                        for (token of data.withPriceTokens) {
                           if (
                              token.tokenAbbr === "USDT" &&
                              token.tokenType === "trc20"
                           ) {
                              newAmount = (token.balance / 1000000).toFixed(0);
                              break;
                           }
                        }
                     })
                     .catch(async (error) => {});
                  const subscribers = await JSON.parse(
                     fs.readFileSync(subscribersFileName, { encoding: "utf8" })
                  );
                  let maxI = transfers.length - 1;
                  for (let i = 0; i < transfers.length; i++) {
                     if (transfers[i].transaction_id === lastTransferId) {
                        maxI = i - 1;
                     }
                  }
                  for (let i = maxI; i >= 0; i--) {
                     if (transfers[i].transaction_id !== lastTransferId) {
                        const transferAmount = (
                           transfers[i].quant / 1000000
                        ).toFixed(0);
                        if (
                           transferAmount >= minAmount ||
                           (newAmount < minAmount + 10000 &&
                              transferAmount > minAmountLow)
                        ) {
                           for (let subscriber in subscribers) {
                              await bot.telegram.sendMessage(
                                 subscribers[subscriber],
                                 `Пополнение: ${transferAmount} USDT${
                                    newAmount !== null
                                       ? `\nНовый баланс: ${newAmount} USDT`
                                       : ""
                                 }`
                              );
                              await sleep(300);
                           }
                        }
                     }
                  }
                  lastTransferId = transfers[0].transaction_id;
                  lastTimeStamp = transfers[0].block_ts;
               }
            } else {
               if (transfers.length > 0) {
                  lastTransferId = transfers[0].transaction_id;
                  lastTimeStamp = transfers[0].block_ts;
               }
            }
            if (transfers) {
               for (let i = 0; i < transfers.length; i++) {
                  console.log(`${i + 1}. ${transfers[i].transaction_id}`);
               }
            }
         })
         .catch((error) => console.error(error));
      await sleep(interval * 1000);

      console.log("Последнее ID вывода " + lastOutId);
      console.log(
         `Последнее время вывода ${
            lastOutTimeStamp &&
            timestampToDate(lastOutTimeStamp, "dd.MM.yyyy HH:mm:ss")
         }`
      );
      await fetch(
         `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=20&start=0&fromAddress=${wallet}&toAddress=${outWallet}&contract_address=${contract_address}&start_timestamp=${lastOutTimeStamp}&end_timestamp=&confirm=false&filterTokenValue=1`,
         {
            headers: {
               "TRON-PRO-API-KEY": tsApiKey,
            },
         }
      )
         .then((response) => response.json())
         .then(async (data) => {
            const outs = data.token_transfers;
            if (lastOutId !== "" && outs.length > 0) {
               if (lastOutId !== outs[0].transaction_id) {
                  const outSubscribers = await JSON.parse(
                     fs.readFileSync(outSubscribersFileName, {
                        encoding: "utf8",
                     })
                  );
                  let maxI = outs.length - 1;
                  for (let i = 0; i < outs.length; i++) {
                     if (outs[i].transaction_id === lastOutId) {
                        maxI = i - 1;
                     }
                  }
                  for (let i = maxI; i >= 0; i--) {
                     if (outs[i].transaction_id !== lastOutId) {
                        for (let subscriber in outSubscribers) {
                           await bot.telegram.sendMessage(
                              outSubscribers[subscriber],
                              `Новый вывод\nСумма: ${(
                                 outs[i].quant / 1000000
                              ).toFixed(1)}\nДата: ${timestampToDate(
                                 outs[i].block_ts,
                                 "HH:mm:ss dd.MM.yyyy"
                              )}\nКошелек: ${outs[i].to_address.slice(
                                 0,
                                 4
                              )}***${outs[i].to_address.slice(-4)}`
                           );
                           await sleep(300);
                        }
                     }
                  }
                  lastOutId = outs[0].transaction_id;
                  lastOutTimeStamp = outs[0].block_ts;
               }
            } else {
               if (outs.length > 0) {
                  lastOutId = outs[0].transaction_id;
                  lastOutTimeStamp = outs[0].block_ts;
               }
            }
            if (outs) {
               for (let i = 0; i < outs.length; i++) {
                  console.log(`${i + 1}. ${outs[i].transaction_id}`);
               }
            }
         })
         .catch((error) => console.error(error));
      await sleep(interval * 1000);
      console.log(" ");
   }
})();

bot.on("message", async (ctx) => {
   if (!ctx.message.text) return;
   if (ctx.message.text.trim() === "/balance") {
      fetch(`https://apilist.tronscanapi.com/api/accountv2?address=${wallet}`, {
         headers: {
            "TRON-PRO-API-KEY": tsApiKey,
         },
      })
         .then((response) => response.json())
         .then(async (data) => {
            let tokenName = "";
            let tokenBalance = "";
            for (token of data.withPriceTokens) {
               if (token.tokenAbbr === "USDT" && token.tokenType === "trc20") {
                  tokenName = token.tokenAbbr;
                  tokenBalance = (token.balance / 1000000).toFixed(0);
                  break;
               }
            }
            if (tokenName !== "" && tokenBalance !== "") {
               await ctx.reply(`Баланс кошелька: ${tokenBalance} ${tokenName}`);
            } else {
               await ctx.reply("USDT не найдено");
            }
         })
         .catch(async (error) => await ctx.reply("Что-то пошло не так"));
   } else if (ctx.message.text.trim() === "/sub") {
      const chatId = ctx.message.chat.id;
      let data = JSON.parse(
         fs.readFileSync(subscribersFileName, { encoding: "utf8" })
      );
      if (chatId in data) {
         await ctx.reply("Вы уже подписаны на рассылку");
      } else {
         data[chatId] = chatId;
         fs.writeFileSync(subscribersFileName, JSON.stringify(data), {
            encoding: "utf8",
            flag: "w",
         });
         const newData = JSON.parse(
            fs.readFileSync(subscribersFileName, { encoding: "utf8" })
         );
         if (chatId in newData) {
            await ctx.reply("Вы подписались на рассылку");
         } else {
            await ctx.reply("Что-то пошло не так");
         }
      }
   } else if (ctx.message.text.trim() === "/unsub") {
      const chatId = ctx.message.chat.id;
      const data = JSON.parse(
         fs.readFileSync(subscribersFileName, { encoding: "utf8" })
      );
      if (chatId in data) {
         delete data[chatId];
         fs.writeFileSync(subscribersFileName, JSON.stringify(data), {
            encoding: "utf8",
            flag: "w",
         });
         const newData = JSON.parse(
            fs.readFileSync(subscribersFileName, { encoding: "utf8" })
         );
         if (chatId in newData) {
            await ctx.reply("Что-то пошло не так");
         } else {
            await ctx.reply("Вы отписались от рассылки");
         }
      } else {
         await ctx.reply("Вы ещё не подписаны на рассылку");
      }
   } else if (ctx.message.text.trim() === "/outsub") {
      const chatId = ctx.message.chat.id;
      let data = JSON.parse(
         fs.readFileSync(outSubscribersFileName, { encoding: "utf8" })
      );
      if (chatId in data) {
         await ctx.reply("Вы уже подписаны на рассылку выводов");
      } else {
         data[chatId] = chatId;
         fs.writeFileSync(outSubscribersFileName, JSON.stringify(data), {
            encoding: "utf8",
            flag: "w",
         });
         const newData = JSON.parse(
            fs.readFileSync(outSubscribersFileName, { encoding: "utf8" })
         );
         if (chatId in newData) {
            await ctx.reply("Вы подписались на рассылку выводов");
         } else {
            await ctx.reply("Что-то пошло не так");
         }
      }
   } else if (ctx.message.text.trim() === "/outunsub") {
      const chatId = ctx.message.chat.id;
      const data = JSON.parse(
         fs.readFileSync(outSubscribersFileName, { encoding: "utf8" })
      );
      if (chatId in data) {
         delete data[chatId];
         fs.writeFileSync(outSubscribersFileName, JSON.stringify(data), {
            encoding: "utf8",
            flag: "w",
         });
         const newData = JSON.parse(
            fs.readFileSync(outSubscribersFileName, { encoding: "utf8" })
         );
         if (chatId in newData) {
            await ctx.reply("Что-то пошло не так");
         } else {
            await ctx.reply("Вы отписались от рассылки выводов");
         }
      } else {
         await ctx.reply("Вы ещё не подписаны на рассылку выводов");
      }
   } else if (ctx.message.text.trim() === "/out") {
      fetch(
         `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=20&start=0&fromAddress=${wallet}&toAddress=${outWallet}&contract_address=${contract_address}&start_timestamp=&end_timestamp=&confirm=false&filterTokenValue=1`,
         {
            headers: {
               "TRON-PRO-API-KEY": tsApiKey,
            },
         }
      )
         .then((response) => response.json())
         .then(async (data) => {
            const transfers = data.token_transfers;
            if (transfers.length > 0) {
               let message = "";
               for (let transfer of transfers) {
                  message += `${(transfer.quant / 1000000).toFixed(
                     1
                  )} USDT ${timestampToDate(
                     transfer.block_ts,
                     "HH:mm:ss dd.MM.yyyy"
                  )}\n`;
               }
               await ctx.reply(message);
            } else await ctx.reply("Выводов не найдено");
         })
         .catch(async (error) => await ctx.reply("Что-то пошло не так"));
   }
});
bot.launch();

function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

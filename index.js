const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const subscribersFileName = "subscribers.json";
const tsApiKey = process.env.TS_TOKEN;
const wallet = "TNFm9JdGoj58wnkos742obF8mN4Xcm5n6X";
const contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const interval = 30;
const minAmount = 10000;
const minAmountLow = 3000;

let lastTransferId = "";

(async () => {
   while (true) {
      console.log("Последнее ID " + lastTransferId);

      await fetch(
         `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=3&start=0&toAddress=${wallet}&contract_address=${contract_address}&start_timestamp=&end_timestamp=&confirm=&filterTokenValue=1`,
         {
            headers: {
               "TRON-PRO-API-KEY": tsApiKey,
            },
         }
      )
         .then((response) => response.json())
         .then(async (data) => {
            const transfers = data.token_transfers;
            if (lastTransferId !== "" && transfers) {
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
               }
            } else {
               if (transfers) lastTransferId = transfers[0].transaction_id;
            }
            for (let i = 0; i < transfers.length; i++) {
               console.log(`${i + 1}. ${transfers[i].transaction_id}`);
            }
				console.log("");
				
         })
         .catch((error) => console.error(error));
      await sleep(interval * 1000);
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
   } else if (ctx.message.text.trim() === "/subscribe") {
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
   } else if (ctx.message.text.trim() === "/unsubscribe") {
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
   }
});
bot.launch();

function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

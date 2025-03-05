const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const fetch = require("node-fetch");
const timestampToDate = require("timestamp-to-date");
const { timeStamp, info } = require("console");
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN);

const contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const interval = 3;
const mainChatId = "-1002404665258";
// 5509442847
// -1002404665258
const mainWallet = {
   address: "TNFm9JdGoj58wnkos742obF8mN4Xcm5n6X",
   deposit: {
      id: "",
      timeStamp: "",
      infoText: "эйфории",
      subFile: "subscribers.json",
      minAmount: 1000,
      showFrom: false,
   },
   out: {
      id: "",
      timeStamp: "",
      infoText: "",
      subFile: "",
   },
   signs: "🔴🔴🔴🔴🔴",
};

const ourWallet = {
   address: "TXhyDNCzdC5WMUfqtVbi9zwf7vgsMkMmKc",
   deposit: {
      id: "",
      timeStamp: "",
      infoText: "нашего кошелька",
      subFile: "outsubscribers.json",
      minAmount: 0,
      showFrom: false,
   },
   out: {
      id: "",
      timeStamp: "",
      infoText: "",
      subFile: "",
   },
   signs: "✅✅✅✅✅ mkc",
};

const ourWallet2 = {
   address: "TAMw6Xq8UzUQVCAqN6vZoYjsM65RerNo9x",
   deposit: {
      id: "",
      timeStamp: "",
      infoText: "нашего кошелька",
      subFile: "outsubscribers.json",
      minAmount: 0,
      showFrom: false,
   },
   out: {
      id: "",
      timeStamp: "",
      infoText: "",
      subFile: "",
   },
   signs: "✅✅✅✅✅ о9х",
};

const padWallet = {
   address: "TAVU6HYWn5Rh85DqEcXTRLLXUt8eA34hCo",
   deposit: {
      id: "",
      timeStamp: "",
      infoText: "прокладки",
      subFile: "padsubscribers.json",
      minAmount: 1000,
      showFrom: false,
   },
   out: {
      id: "",
      timeStamp: "",
      infoText: "прокладки",
      subFile: "padoutsubscribers.json",
   },
   signs: "",
};

(async () => {
   while (true) {
      await checkDeposit(mainWallet, true);
      await checkDeposit(ourWallet, false, false);
      await checkDeposit(ourWallet2, false, false);
      await checkDeposit(padWallet);
      await checkOut(padWallet);
      // await sleep(interval * 1000);
    //   console.log("----------------------------------------------------------");
   }
})();

bot.on("message", async (ctx) => {
   if (!ctx.message.text) return;
   if (ctx.message.text.trim() === "/balance") {
      checkBalance(ctx, mainWallet);
   } else if (ctx.message.text.trim() === "/padbalance") {
      checkBalance(ctx, padWallet);
   } else if (ctx.message.text.trim() === "/sub") {
      sub(ctx, mainWallet.deposit.subFile, "пополнений");
   } else if (ctx.message.text.trim() === "/unsub") {
      unsub(ctx, mainWallet.deposit.subFile, "пополнений");
   } else if (ctx.message.text.trim() === "/outsub") {
      sub(ctx, ourWallet.deposit.subFile, "выводов");
   } else if (ctx.message.text.trim() === "/outunsub") {
      unsub(ctx, ourWallet.deposit.subFile, "выводов");
   } else if (ctx.message.text.trim() === "/padsub") {
      sub(ctx, padWallet.deposit.subFile, "пополнений прокладки");
   } else if (ctx.message.text.trim() === "/padunsub") {
      unsub(ctx, padWallet.deposit.subFile, "пополнений прокладки");
   } else if (ctx.message.text.trim() === "/padoutsub") {
      sub(ctx, padWallet.out.subFile, "выводов с прокладки");
   } else if (ctx.message.text.trim() === "/padoutunsub") {
      unsub(ctx, padWallet.out.subFile, "выводов с прокладки");
   } else if (ctx.message.text.trim() === "/out") {
      fetch(
         `https://api.trongrid.io/v1/accounts/${ourWallet.address}/transactions/trc20?limit=20&contract_address=${contract_address}&only_to=true`
      )
         .then((response) => response.json())
         .then(async (data) => {
            const transfers = data.data;
            if (transfers.length > 0) {
               let message = "";

               for (let transfer of transfers) {
                  if (transfer.from === mainWallet.address) {
                     message += `${stringValue(
                        editedValue(transfer.value, 1)
                     )} USDT ${timestampToDate(
                        transfer.block_timestamp,
                        "HH:mm:ss dd.MM.yyyy"
                     )}\n`;
                  }
               }
               await ctx.reply(message);
            } else await ctx.reply("Выводов не найдено");
         })
         .catch(async (error) => await ctx.reply("Что-то пошло не так"));
   } else if (ctx.message.text.trim() === "/recent") {
      const wallets = [ourWallet, ourWallet2];
      const nowDate = new Date();
      const minTimestamp = new Date(
         nowDate.getTime() - 10 * 60 * 1000
      ).getTime();
      let info = "";
      let sumAll = 0;
      let countAll = 0;
      for (let wallet of wallets) {
         info += `<b>${wallet.address.substring(
            wallet.address.length - 3
         )}</b>\n`;
         await fetch(
            `https://api.trongrid.io/v1/accounts/${wallet.address}/transactions/trc20?limit=20&contract_address=${contract_address}&min_timestamp=${minTimestamp}&only_to=true`
         )
            .then((response) => response.json())
            .then(async (data) => {
               const transfers = data.data;
               let sum = 0;
               for (let transfer of transfers) {
                  sum += +editedValue(transfer.value);
               }
               sumAll += sum;
               countAll += transfers.length;
               info += `${stringValue(sum)} USDT (${transfers.length})\n`;
            })
            .catch((error) => {
               info += `Ошибка\n`;
               console.error(error);
            });
         info += `\n`;
      }
      info += `<b>Всего</b>\n${stringValue(sumAll)} USDT (${countAll})`;
      await ctx.reply(info, { parse_mode: "HTML" });
   }
});
bot.launch();

function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

function editedValue(value, decimalPlaces = 0) {
   return (value / 1000000).toFixed(decimalPlaces);
}

async function sub(ctx, file, text) {
   const chatId = ctx.message.chat.id;
   let data = JSON.parse(fs.readFileSync(file, { encoding: "utf8" }));
   if (chatId in data) {
      await ctx.reply("Вы уже подписаны на рассылку " + text);
   } else {
      data[chatId] = chatId;
      fs.writeFileSync(file, JSON.stringify(data), {
         encoding: "utf8",
         flag: "w",
      });
      const newData = JSON.parse(fs.readFileSync(file, { encoding: "utf8" }));
      if (chatId in newData) {
         await ctx.reply("Вы подписались на рассылку " + text);
      } else {
         await ctx.reply("Что-то пошло не так");
      }
   }
}

async function unsub(ctx, file, text) {
   const chatId = ctx.message.chat.id;
   const data = JSON.parse(fs.readFileSync(file, { encoding: "utf8" }));
   if (chatId in data) {
      delete data[chatId];
      fs.writeFileSync(file, JSON.stringify(data), {
         encoding: "utf8",
         flag: "w",
      });
      const newData = JSON.parse(fs.readFileSync(file, { encoding: "utf8" }));
      if (chatId in newData) {
         await ctx.reply("Что-то пошло не так");
      } else {
         await ctx.reply("Вы отписались от рассылки " + text);
      }
   } else {
      await ctx.reply("Вы ещё не подписаны на рассылку " + text);
   }
}

async function checkDeposit(wallet, isNeedAlert = false, isRound = true) {
//    console.log(
//       `Последнее ID пополнения ${wallet.deposit.infoText} ${wallet.deposit.id}`
//    );
//    console.log(
//       `Последнее время пополнения ${wallet.deposit.infoText} ${
//          wallet.deposit.timeStamp &&
//          timestampToDate(wallet.deposit.timeStamp, "dd.MM.yyyy HH:mm:ss")
//       }`
//    );

   await fetch(
      `https://api.trongrid.io/v1/accounts/${wallet.address}/transactions/trc20?limit=20&contract_address=${contract_address}&min_timestamp=${wallet.deposit.timeStamp}&only_to=true`
   )
      .then((response) => response.json())
      .then(async (data) => {
         const transfers = data.data;
         if (wallet.deposit.id !== "" && transfers.length > 0) {
            if (wallet.deposit.id !== transfers[0].transaction_id) {
               let newAmount = null;
               await sleep(10);
               await fetch(
                  `https://api.trongrid.io/v1/accounts/${wallet.address}`
               )
                  .then((response) => response.json())
                  .then(async (data) => {
                     if (data.data.length > 0) {
                        if (data.data[0].trc20.length > 0) {
                           for (let el of data.data[0].trc20) {
                              for (let token in el) {
                                 if (token === contract_address) {
                                    newAmount = editedValue(el[token]);
                                    break;
                                 }
                              }
                           }
                        }
                     }
                  })
                  .catch(async (error) => {});

               let maxI = transfers.length - 1;
               for (let i = 0; i < transfers.length; i++) {
                  if (transfers[i].transaction_id === wallet.deposit.id) {
                     maxI = i - 1;
                  }
               }

               let isAlert = false;
               for (let i = maxI; i >= 0; i--) {
                  if (transfers[i].transaction_id !== wallet.deposit.id) {
                     const transferAmount = editedValue(transfers[i].value);
                     if (transferAmount >= wallet.deposit.minAmount) {
                        isAlert = true;
                        await bot.telegram.sendMessage(
                           mainChatId,
                           `${wallet.signs && wallet.signs + "\n"}Пополнение ${
                              wallet.deposit.infoText
                           } ${
                              wallet.deposit.showFrom
                                 ? "\nС кошелька: " +
                                   transfers[i].from.slice(0, 4) +
                                   "***" +
                                   transfers[i].from.slice(-4)
                                 : ""
                           }\nСумма: ${
                              isRound
                                 ? stringValue(transferAmount)
                                 : stringValue(
                                      editedValue(transfers[i].value, 1)
                                   )
                           } USDT\nВремя: ${timestampToDate(
                              transfers[i].block_timestamp,
                              "HH:mm:ss"
                           )}${
                              newAmount !== null
                                 ? `\nНовый баланс: ${stringValue(
                                      newAmount
                                   )} USDT`
                                 : ""
                           }`
                        );
                     }
                  }
               }
               wallet.deposit.id = transfers[0].transaction_id;
               wallet.deposit.timeStamp = transfers[0].block_timestamp;
               if (isAlert && isNeedAlert) {
                  setTimeout(async () => {
                     await fetch(
                        `https://api.trongrid.io/v1/accounts/${wallet.address}`
                     )
                        .then((response) => response.json())
                        .then(async (data) => {
                           if (data.data.length > 0) {
                              if (data.data[0].trc20.length > 0) {
                                 for (let el of data.data[0].trc20) {
                                    for (let token in el) {
                                       if (token === contract_address) {
                                          await bot.telegram.sendMessage(
                                             mainChatId,
                                             `Баланс ${
                                                wallet.deposit.infoText
                                             }: ${stringValue(
                                                editedValue(el[token])
                                             )} USDT`
                                          );
                                          break;
                                       }
                                    }
                                 }
                              }
                           }
                        })
                        .catch(async (error) => {});
                  }, 60000);
               }
            }
         } else {
            if (transfers.length > 0) {
               wallet.deposit.id = transfers[0].transaction_id;
               wallet.deposit.timeStamp = transfers[0].block_timestamp;
            }
         }
         if (transfers) {
            for (let i = 0; i < transfers.length; i++) {
               console.log(`${i + 1}. ${transfers[i].transaction_id}`);
            }
         }
      })
      .catch((error) => console.error(error));
   await sleep(10);
//    console.log(" ");
}

async function checkOut(wallet) {
   console.log(`Последнее ID вывода с ${wallet.out.infoText} ${wallet.out.id}`);
   console.log(
      `Последнее время вывода с ${wallet.out.infoText} ${
         wallet.out.timeStamp &&
         timestampToDate(wallet.out.timeStamp, "dd.MM.yyyy HH:mm:ss")
      }`
   );
   await fetch(
      `https://api.trongrid.io/v1/accounts/${wallet.address}/transactions/trc20?limit=20&contract_address=${contract_address}&min_timestamp=${wallet.out.timeStamp}&only_from=true`
   )
      .then((response) => response.json())
      .then(async (data) => {
         const outs = data.data;
         if (wallet.out.id !== "" && outs.length > 0) {
            if (wallet.out.id !== outs[0].transaction_id) {
               const outSubscribers = await JSON.parse(
                  fs.readFileSync(wallet.out.subFile, {
                     encoding: "utf8",
                  })
               );
               let maxI = outs.length - 1;
               for (let i = 0; i < outs.length; i++) {
                  if (outs[i].transaction_id === wallet.out.id) {
                     maxI = i - 1;
                  }
               }
               for (let i = maxI; i >= 0; i--) {
                  if (outs[i].transaction_id !== wallet.out.id) {
                     for (let subscriber in outSubscribers) {
                        await bot.telegram.sendMessage(
                           outSubscribers[subscriber],
                           `Новый вывод с ${
                              wallet.out.infoText
                           }\nНа кошелек: ${outs[i].to.slice(0, 4)}***${outs[
                              i
                           ].to.slice(-4)}\nСумма: ${stringValue(
                              editedValue(outs[i].value)
                           )}\nВремя: ${timestampToDate(
                              outs[i].block_timestamp,
                              "HH:mm:ss"
                           )}`
                        );
                        await sleep(100);
                     }
                  }
               }
               wallet.out.id = outs[0].transaction_id;
               wallet.out.timeStamp = outs[0].block_timestamp;
            }
         } else {
            if (outs.length > 0) {
               wallet.out.id = outs[0].transaction_id;
               wallet.out.timeStamp = outs[0].block_timestamp;
            }
         }
         if (outs) {
            for (let i = 0; i < outs.length; i++) {
               console.log(`${i + 1}. ${outs[i].transaction_id}`);
            }
         }
      })
      .catch((error) => console.error(error));
   console.log(" ");
}

async function checkBalance(ctx, wallet) {
   fetch(`https://api.trongrid.io/v1/accounts/${wallet.address}`)
      .then((response) => response.json())
      .then(async (data) => {
         if (data.data.length > 0) {
            if (data.data[0].trc20.length > 0) {
               let findUsdt = false;
               for (let el of data.data[0].trc20) {
                  for (let token in el) {
                     if (token === contract_address) {
                        await ctx.reply(
                           `Баланс ${wallet.deposit.infoText}: ${stringValue(
                              editedValue(el[token])
                           )} USDT`
                        );
                        findUsdt = true;
                        break;
                     }
                  }
               }
               if (!findUsdt) {
                  await ctx.reply("USDT не найдено");
               }
            } else {
               await ctx.reply("Ошибка получения баланса");
            }
         } else {
            await ctx.reply("Ошибка получения баланса");
         }
      })
      .catch(async (error) => await ctx.reply("Что-то пошло не так"));
}
function stringValue(value) {
   return value.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// if (
// 	transferAmount >= minAmount ||
// 	(newAmount < minAmount + 10000 &&
// 		transferAmount > minAmountLow)
// ) {}

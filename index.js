const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const fca = require('ws3-fca');
const axios = require('axios');
const { execSync } = require('child_process');
const express = require('express');
const { WebSocketServer } = require('ws');
const pm2 = require('pm2');

let globalConfig;
let appState;

// --- تحميل الإعدادات ---
try {
  globalConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (error) {
  console.error(chalk.red('[خطأ في الإعدادات] فشل تحميل ملف config.json:'), error.message);
  process.exit(1);
}

try {
  appState = JSON.parse(fs.readFileSync('appState.json', 'utf8'));
} catch (error) {
  console.error(chalk.red('[خطأ في الحالة] فشل تحميل ملف appState.json:'), error.message);
  process.exit(1);
}

// --- إعداد اللغات ---
const langCode = globalConfig.language || 'ar'; // افتراضي عربي لعيون سينكو
let pathLanguageFile = path.join(__dirname, 'languages', `${langCode}.lang`);

if (!fs.existsSync(pathLanguageFile)) {
  console.warn(`ملف اللغة ${langCode} غير موجود، سيتم استخدام اللغة الافتراضية "ar.lang"`);
  pathLanguageFile = path.join(__dirname, 'languages', 'ar.lang');
}

// (منطق قراءة اللغة يبقى كما هو برمجياً)
const readLanguage = fs.readFileSync(pathLanguageFile, "utf-8");
const languageData = readLanguage.split(/\r?\n|\r/).filter(line => line && !line.trim().startsWith("#") && line !== "");
global.language = {};
for (const sentence of languageData) {
  const getSeparator = sentence.indexOf('=');
  const itemKey = sentence.slice(0, getSeparator).trim();
  const itemValue = sentence.slice(getSeparator + 1).trim();
  const head = itemKey.slice(0, itemKey.indexOf('.'));
  const key = itemKey.replace(head + '.', '');
  if (!global.language[head]) global.language[head] = {};
  global.language[head][key] = itemValue.replace(/\\n/gi, '\n');
}

function getText(head, key, ...args) {
  if (!global.language[head]?.[key]) return `لم يتم العثور على النص: "${head}.${key}"`;
  let text = global.language[head][key];
  for (let i = args.length - 1; i >= 0; i--) text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
  return text;
}

const startTime = Date.now();

// --- إعداد سيرفر الويب (الاستمرارية) ---
const app = express();
let PORT = process.env.PORT || 28140;
app.use(express.static(path.join(__dirname, 'public')));

async function startServer(attempt = 0) {
  try {
    const server = await new Promise((resolve, reject) => {
      app.listen(PORT, () => {
        console.log(chalk.cyan(`[سيرفر] البوت يعمل على المنفذ: ${PORT}`));
        resolve();
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempt < 5) {
          PORT++;
          startServer(attempt + 1).then(resolve).catch(reject);
        } else reject(err);
      });
    });
  } catch (err) {
    console.error('[سيرفر] فشل في بدء تشغيل سيرفر الويب:', err.message);
  }
}
startServer();

// --- تحميل الأوامر والأحداث ---
const commands = new Map();
const events = new Map();
const commandsDir = path.join(__dirname, 'scripts', 'commands');
const eventsDir = path.join(__dirname, 'scripts', 'events');

const chalkGradient = (text) => {
  const colors = ['#00FFFF', '#55AAFF', '#AA55FF', '#FF55AA', '#FF5555'];
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const colorIndex = Math.floor((i / text.length) * colors.length);
    result += chalk.hex(colors[colorIndex])(text[i]);
  }
  return result;
};

const abstractBox = chalk.hex('#55FFFF')('═══════════════✨ＮＯＢＡＲＡ✨═══════════════');

fs.readdirSync(commandsDir).forEach(file => {
  if (file.endsWith('.js')) {
    try {
      const command = require(path.join(commandsDir, file));
      commands.set(command.config.name.toLowerCase(), command);
      console.log(chalk.hex('#00FFFF')(`✨ تم تحميل الأمر: ${chalkGradient(command.config.name)}`));
    } catch (e) { console.error(chalk.red(`🔥 فشل تحميل الأمر ${file}: ${e.message}`)); }
  }
});

if (fs.existsSync(eventsDir)) {
  fs.readdirSync(eventsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const eventHandler = require(path.join(eventsDir, file));
        events.set(eventHandler.name.toLowerCase(), eventHandler);
        console.log(chalk.hex('#AA55FF')(`✨ تم تحميل الحدث: ${chalkGradient(eventHandler.name)}`));
      } catch (e) { console.error(chalk.red(`🔥 فشل تحميل الحدث ${file}: ${e.message}`)); }
    }
  });
}

global.commands = commands;

// --- تسجيل الدخول والعمليات ---
fca({ appState }, (err, api) => {
  if (err) return console.error(chalk.red('🔥 فشل تسجيل الدخول:'), err.stack);

  console.log(chalk.hex('#00FFFF')(`🌟 ${chalkGradient(`${globalConfig.botName} جاهز للعمل!`)} 🌟`));

  api.listenMqtt((err, event) => {
    if (err) return;

    if (event.type === 'message') {
      const { body, senderID, threadID, messageID } = event;
      const isImage = event.attachments?.[0]?.type === 'photo';

      api.getUserInfo(senderID, (err, userInfo) => {
        const userName = userInfo[senderID]?.name || 'مستخدم غير معروف';

        // طباعة اللوج الفخم في الترمكس
        console.log(abstractBox);
        console.log(chalk.hex('#00FFFF')(`👤 العضو: ${userName}`));
        console.log(chalk.hex('#55AAFF')(`💬 الرسالة: ${isImage ? '[صورة]' : body}`));
        console.log(chalk.hex('#FF55AA')(`🧵 المجموعة: ${threadID}`));
        console.log(abstractBox);

        // --- معالجة التحميل التلقائي (Event) ---
        const autoDL = events.get('التحميل_التلقائي') || events.get('socialmediadownloader');
        if (autoDL) autoDL.handle({ api, event });

        const msgLower = (body || "").toLowerCase().trim();
        const prefix = globalConfig.prefix;

        // --- أوامر بدون بادئة ---
        let noPrefixCmd = [...commands.values()].find(c => c.config.usePrefix === false && (msgLower === c.config.name || c.config.aliases?.includes(msgLower)));
        if (noPrefixCmd) return noPrefixCmd.run({ api, event, args: msgLower.split(/\s+/), config: globalConfig, getText });

        // --- أوامر بالبادئة (Prefix) ---
        if (body?.startsWith(prefix)) {
          const args = body.slice(prefix.length).trim().split(/\s+/);
          const cmdName = args.shift().toLowerCase();
          let command = commands.get(cmdName) || [...commands.values()].find(c => c.config.aliases?.includes(cmdName));

          if (command) {
            if (command.config.adminOnly && !globalConfig.adminUIDs.includes(senderID)) {
              api.setMessageReaction("❌", messageID, () => {}, true);
              return api.sendMessage("⚠️ هذا الأمر للمطورين فقط يا وحش!", threadID, messageID);
            }
            try {
              command.run({ api, event, args, config: globalConfig, getText });
            } catch (e) {
              api.sendMessage(`⚠️ خطأ: ${e.message}`, threadID, messageID);
            }
          } else {
            api.sendMessage(`🦆 [${cmdName}]  ${prefix}`, threadID, messageID);
          }
        }
      });
    }

    // --- معالجة أحداث الانضمام والمغادرة ---
    if (event.type === 'event') {
      if (event.logMessageType === 'log:subscribe') events.get('انضمام')?.handle({ api, event });
      if (event.logMessageType === 'log:unsubscribe') events.get('مغادرة')?.handle({ api, event });
    }
  });
});

const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID  = "5881087734";
const SHOP_URL  = "https://myshoperor.netlify.app";

const bot = new Telegraf(BOT_TOKEN);

// ─── /start ───────────────────────────────────────────────────────────────────
bot.start((ctx) => {
    ctx.reply(
        `Привет, ${ctx.from.first_name}! 👋\n\nНажми кнопку чтобы открыть магазин.`,
        Markup.keyboard([
            [Markup.button.webApp("🛒 Открыть магазин", SHOP_URL)]
        ]).resize()
    );
});

// ─── Фото → ссылка (только для админа) ───────────────────────────────────────
bot.on('photo', async (ctx) => {
    if (String(ctx.from.id) !== ADMIN_ID) return;

    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];

    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${best.file_id}`);
        const data = await res.json();
        const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;

        await ctx.reply(
            `✅ Ссылка для таблицы:\n\n<code>${url}</code>\n\n📋 Нажми чтобы скопировать`,
            { parse_mode: 'HTML' }
        );
    } catch(e) {
        await ctx.reply('❌ Ошибка получения ссылки');
    }
});

// ─── Заказ из Mini App ────────────────────────────────────────────────────────
bot.on('web_app_data', async (ctx) => {
    let order;
    try {
        order = JSON.parse(ctx.webAppData.data.text());
    } catch(e) {
        return ctx.reply("❌ Ошибка обработки заказа.");
    }

    const itemsText = (order.items || []).map(item => {
        const attrs = Object.entries(item.variation_attrs || {}).map(([k,v]) => `${k}: ${v}`).join(', ');
        return `• ${item.product_name}${attrs?' ('+attrs+')':''}\n  ${item.price} × ${item.quantity} = ${item.price*item.quantity} сум`;
    }).join('\n');

    const msg =
        `🆕 <b>Новый заказ!</b>\n\n`+
        `👤 <b>Клиент:</b> ${order.name||'—'}\n`+
        `📞 <b>Телефон:</b> ${order.phone||'—'}\n`+
        `🚚 <b>Доставка:</b> ${order.delivery||'—'}\n`+
        `📍 <b>Адрес:</b> ${order.address||'—'}\n`+
        `💳 <b>Оплата:</b> ${order.payment||'—'}\n`+
        `💬 <b>Комментарий:</b> ${order.comment||'—'}\n\n`+
        `📦 <b>Товары:</b>\n${itemsText}\n\n`+
        `💰 <b>Итого: ${order.total||0} сум</b>\n`+
        `🔗 TG: @${order.username||'—'} (id: ${order.user_id||'—'})`;

    await ctx.reply('✅ <b>Заказ принят!</b>\nМы свяжемся с вами в ближайшее время. 🙏', { parse_mode: 'HTML' });
    await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'HTML' });
});

bot.launch().then(() => console.log('Бот запущен ✅'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

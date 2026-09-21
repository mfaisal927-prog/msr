"use server";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

// --- STORES ---
let storesSeeded = false;

export async function seedDefaultStores() {
    try {
        const defaultStores = [
            "بنگالی سبزی مارکیٹ",
            "بنگالی سپر سٹور",
            "نستو",
            "الاستقرار",
            "البیادر",
            "ہائی مارٹ",
            "صناعیہ بیکری",
            "پیٹرول پمپ"
        ];

        const existing = await prisma.store.findMany({
            where: { name: { in: defaultStores } }
        });

        const existingNames = existing.map(s => s.name);
        const toCreate = defaultStores.filter(name => !existingNames.includes(name));

        if (toCreate.length > 0) {
            await prisma.store.createMany({
                data: toCreate.map(name => ({ name }))
            });
            revalidatePath('/purchases');
            revalidatePath('/stores');
        }
    } catch (e) {
        console.error("Seed error:", e);
    }
}

export async function getStores() {
    try {
        if (!storesSeeded) {
            await seedDefaultStores();
            storesSeeded = true;
        }
        return await prisma.store.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function addStore(data) {
    try {
        const store = await prisma.store.create({ data });
        revalidatePath('/purchases');
        revalidatePath('/stores');
        return { success: true, store };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to add store" };
    }
}

export async function updateStore(id, data) {
    try {
        const store = await prisma.store.update({
            where: { id: parseInt(id) },
            data
        });
        revalidatePath('/purchases');
        revalidatePath('/stores');
        return { success: true, store };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to update store" };
    }
}

export async function deleteStore(id) {
    try {
        const usageCount = await prisma.purchaseLine.count({
            where: { storeId: parseInt(id) }
        });
        if (usageCount > 0) {
            return { success: false, error: "یہ اسٹور پہلے سے ریکارڈ میں استعمال ہو رہا ہے، حذف نہیں ہو سکتا" };
        }

        await prisma.store.update({
            where: { id: parseInt(id) },
            data: { is_active: false }
        });
        revalidatePath('/purchases');
        revalidatePath('/stores');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to delete store" };
    }
}

// --- ITEMS ---
let itemsSeeded = false;

export async function seedDefaultItems() {
    try {
        const defaultItems = [
            { name: "انڈے کریٹ", category: "گروسری", default_unit: "Pcs" },
            { name: "دہی", category: "ڈیری", default_unit: "Kg" },
            { name: "برگر", category: "گروسری", default_unit: "Pcs" },
            { name: "چینی", category: "گروسری", default_unit: "Kg" },
            { name: "دودھ", category: "ڈیری", default_unit: "Liter" },
            { name: "پانی", category: "پانی", default_unit: "Pcs" },
            { name: "گیس سلنڈر", category: "گیس", default_unit: "Pcs" },
            { name: "سیب", category: "پھل", default_unit: "Kg" },
            { name: "کیلے", category: "پھل", default_unit: "Dozen" },
            { name: "انار", category: "پھل", default_unit: "Kg" },
            { name: "انگور", category: "پھل", default_unit: "Kg" },
            { name: "آلو", category: "سبزیاں", default_unit: "Kg" },
            { name: "پیاز", category: "سبزیاں", default_unit: "Kg" },
            { name: "ٹماٹر", category: "سبزیاں", default_unit: "Kg" },
            { name: "دھنیا", category: "سبزیاں", default_unit: "Kg" },
            { name: "پودینہ", category: "سبزیاں", default_unit: "Kg" },
            { name: "بند گوبھی", category: "سبزیاں", default_unit: "Kg" },
            { name: "دال چنا", category: "گروسری", default_unit: "Kg" },
            { name: "بیسن", category: "گروسری", default_unit: "Kg" },
            { name: "میدہ", category: "گروسری", default_unit: "Kg" },
            { name: "گول گپے", category: "گروسری", default_unit: "Pcs" },
            { name: "کیچپ", category: "گروسری", default_unit: "Kg" },
            { name: "بادام", category: "ڈرائی فروٹس", default_unit: "Kg" },
            { name: "کاجو", category: "ڈرائی فروٹس", default_unit: "Kg" },
            { name: "اخروٹ", category: "ڈرائی فروٹس", default_unit: "Kg" },
            { name: "میوہ", category: "ڈرائی فروٹس", default_unit: "Kg" },
            { name: "مائیونیز", category: "گروسری", default_unit: "Kg" }
        ];

        const existingNamesQuery = await prisma.item.findMany({ select: { name: true } });
        const existingNames = existingNamesQuery.map(i => i.name);

        const toCreate = defaultItems.filter(item => !existingNames.includes(item.name));

        if (toCreate.length > 0) {
            await prisma.item.createMany({
                data: toCreate
            });
            revalidatePath('/purchases');
            revalidatePath('/items');
        }
    } catch (e) {
        console.error("Seed error:", e);
    }
}

export async function getItems() {
    try {
        if (!itemsSeeded) {
            await seedDefaultItems();
            itemsSeeded = true;
        }
        return await prisma.item.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function addItem(data) {
    try {
        const item = await prisma.item.create({ data });
        revalidatePath('/purchases');
        revalidatePath('/items');
        return { success: true, item };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to add item" };
    }
}

export async function updateItem(id, data) {
    try {
        const item = await prisma.item.update({
            where: { id: parseInt(id) },
            data
        });
        revalidatePath('/purchases');
        revalidatePath('/items');
        return { success: true, item };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to update item" };
    }
}

export async function deleteItem(id) {
    try {
        const usageCount = await prisma.purchaseLine.count({
            where: { itemId: parseInt(id) }
        });
        if (usageCount > 0) {
            return { success: false, error: "یہ آئٹم پہلے سے ریکارڈ میں استعمال ہو رہا ہے، حذف نہیں ہو سکتا" };
        }

        await prisma.item.update({
            where: { id: parseInt(id) },
            data: { is_active: false }
        });
        revalidatePath('/purchases');
        revalidatePath('/items');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to delete item" };
    }
}

// --- PURCHASES ---
function revalidatePurchaseViews() {
    revalidatePath('/purchases');
    revalidatePath('/dashboard');
    revalidatePath('/monthly');
    revalidatePath('/daily');
    revalidatePath('/price-compare');
}

function numberOrZero(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function getDailyDateParts(date) {
    const d = new Date(date);
    const daysArr = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

    return {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        dayText: daysArr[d.getDay()]
    };
}

function normalizePurchaseLine(line, itemMap) {
    const itemId = parseInt(line.itemId);
    const storeId = parseInt(line.storeId);
    const unit = line.unit || "Kg";
    const baseUnit = itemMap[itemId] || unit;
    const quantity = numberOrZero(line.quantity);
    const unitPrice = numberOrZero(line.unit_price);
    const totalPrice = numberOrZero(line.total_price) || Number((quantity * unitPrice).toFixed(3));

    let quantityInBaseUnit = quantity;
    const lineUnit = unit.toLowerCase();
    const baseUnitLower = (baseUnit || "").toLowerCase();

    if ((lineUnit === 'gram' || lineUnit === 'g') && baseUnitLower === 'kg') {
        quantityInBaseUnit = quantityInBaseUnit / 1000.0;
    } else if ((lineUnit === 'ml' || lineUnit === 'milliliter') && baseUnitLower === 'liter') {
        quantityInBaseUnit = quantityInBaseUnit / 1000.0;
    }

    const unitPricePerBaseUnit = quantityInBaseUnit > 0 ? (totalPrice / quantityInBaseUnit) : unitPrice;

    return {
        itemId,
        storeId,
        quantity,
        unit,
        unit_price: unitPrice,
        total_price: totalPrice,
        quantity_in_base_unit: quantityInBaseUnit,
        unit_price_per_base_unit: unitPricePerBaseUnit,
        item_image_url: line.item_image_url || null
    };
}

async function createPurchaseLines(tx, entryId, lines) {
    const items = await tx.item.findMany({ select: { id: true, default_unit: true } });
    const itemMap = Object.fromEntries(items.map(item => [item.id, item.default_unit]));

    for (const line of lines) {
        await tx.purchaseLine.create({
            data: {
                purchaseEntryId: entryId,
                ...normalizePurchaseLine(line, itemMap)
            }
        });
    }
}

async function syncDailyPurchaseTotal(tx, date) {
    if (!date) return;

    const entry = await tx.purchaseEntry.findUnique({
        where: { date },
        include: { lines: { select: { total_price: true } } }
    });
    const newTotalPurchase = entry?.lines?.reduce((sum, line) => sum + numberOrZero(line.total_price), 0) || 0;
    const daily = await tx.dailyEntry.findUnique({ where: { date } });

    if (daily) {
        const updatedProfit = numberOrZero(daily.sale_total) - newTotalPurchase - numberOrZero(daily.expense_total);
        await tx.dailyEntry.update({
            where: { id: daily.id },
            data: {
                purchase_total: newTotalPurchase,
                profit_total: updatedProfit
            }
        });
        return;
    }

    if (newTotalPurchase > 0) {
        const { month, year, dayText } = getDailyDateParts(date);
        await tx.dailyEntry.create({
            data: {
                date,
                day_text: dayText,
                month,
                year,
                sale_total: 0,
                purchase_total: newTotalPurchase,
                expense_total: 0,
                profit_total: -newTotalPurchase,
                extra_expense_total: 0
            }
        });
    }
}

export async function getPurchaseHistory() {
    try {
        return await prisma.purchaseEntry.findMany({
            include: {
                lines: {
                    include: { item: true, store: true },
                    orderBy: { id: 'asc' }
                }
            },
            orderBy: { date: 'desc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getPurchaseEntry(id) {
    try {
        const entry = await prisma.purchaseEntry.findUnique({
            where: { id: parseInt(id) },
            include: {
                lines: {
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                default_unit: true
                            }
                        },
                        store: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!entry) return null;

        return {
            id: entry.id,
            date: entry.date,
            notes: entry.notes || "",
            lines: entry.lines.map(line => ({
                id: line.id,
                itemId: line.itemId,
                itemName: line.item?.name || "",
                storeId: line.storeId,
                quantity: line.quantity,
                unit: line.unit,
                unit_price: line.unit_price,
                total_price: line.total_price,
                item_image_url: line.item_image_url || null,
                item: line.item,
                store: line.store
            }))
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPurchaseEntryByDate(date) {
    try {
        if (!date) return null;
        const entry = await prisma.purchaseEntry.findUnique({
            where: { date },
            select: { id: true, date: true }
        });

        return entry;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function addPurchaseEntry(date, notes, lines) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const entry = await tx.purchaseEntry.upsert({
                where: { date: date },
                update: { notes: notes },
                create: { date: date, notes: notes }
            });

            await createPurchaseLines(tx, entry.id, lines);
            await syncDailyPurchaseTotal(tx, date);

            return entry;
        });

        revalidatePurchaseViews();
        return { success: true, result };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.message || "Failed to add purchase entry" };
    }
}

export async function updatePurchaseEntry(id, date, notes, lines) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const entry = await tx.purchaseEntry.findUnique({
                where: { id: parseInt(id) },
                select: { id: true, date: true }
            });

            if (!entry) {
                throw new Error("خریداری کا ریکارڈ نہیں ملا۔");
            }

            if (date !== entry.date) {
                const dateOwner = await tx.purchaseEntry.findUnique({
                    where: { date },
                    select: { id: true }
                });

                if (dateOwner && dateOwner.id !== entry.id) {
                    throw new Error("اس تاریخ کی خریداری پہلے سے موجود ہے۔ اسی تاریخ کا ریکارڈ edit کریں یا دوسری تاریخ منتخب کریں۔");
                }
            }

            const previousDate = entry.date;
            const updatedEntry = await tx.purchaseEntry.update({
                where: { id: entry.id },
                data: { date, notes }
            });

            await tx.purchaseLine.deleteMany({
                where: { purchaseEntryId: entry.id }
            });
            await createPurchaseLines(tx, entry.id, lines);
            await syncDailyPurchaseTotal(tx, date);

            if (previousDate !== date) {
                await syncDailyPurchaseTotal(tx, previousDate);
            }

            return updatedEntry;
        });

        revalidatePurchaseViews();
        return { success: true, result };
    } catch (e) {
        console.error(e);
        return { success: false, error: e.message || "Failed to update purchase entry" };
    }
}

function parseDateKey(dateKey) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function emptyPeriod() {
    return { quantity: 0, amount: 0, count: 0 };
}

function addToPeriod(period, quantity, amount) {
    period.quantity += quantity;
    period.amount += amount;
    period.count += 1;
}

function roundNumber(value) {
    return Number((value || 0).toFixed(3));
}

function sanitizeCustomDays(days) {
    const parsed = parseInt(days, 10);
    if (!Number.isFinite(parsed)) return 7;
    return Math.min(365, Math.max(1, parsed));
}

function serializePeriod(period) {
    return {
        quantity: roundNumber(period.quantity),
        amount: roundNumber(period.amount),
        count: period.count || 0
    };
}

// Item-wise consumption/purchase summary for latest available purchase date.
export async function getItemUsageSummary(customDaysInput = 7) {
    const customDays = sanitizeCustomDays(customDaysInput);
    try {
        const lines = await prisma.purchaseLine.findMany({
            include: {
                item: true,
                entry: true
            }
        });

        const validLines = lines.filter(line => line.entry?.date && parseDateKey(line.entry.date));

        if (validLines.length === 0) {
            return {
                reportDate: null,
                customDays,
                ranges: null,
                totals: {
                    day: emptyPeriod(),
                    custom: emptyPeriod(),
                    week: emptyPeriod(),
                    twoWeeks: emptyPeriod(),
                    month: emptyPeriod()
                },
                items: []
            };
        }

        const reportDate = validLines
            .map(line => line.entry.date)
            .sort()
            .at(-1);

        const report = parseDateKey(reportDate);
        const weekStart = formatDateKey(addDays(report, -6));
        const twoWeeksStart = formatDateKey(addDays(report, -13));
        const customStart = formatDateKey(addDays(report, -(customDays - 1)));
        const monthStart = formatDateKey(new Date(Date.UTC(report.getUTCFullYear(), report.getUTCMonth(), 1)));

        const ranges = {
            day: { start: reportDate, end: reportDate },
            custom: { start: customStart, end: reportDate },
            week: { start: weekStart, end: reportDate },
            twoWeeks: { start: twoWeeksStart, end: reportDate },
            month: { start: monthStart, end: reportDate }
        };

        const totals = {
            day: emptyPeriod(),
            custom: emptyPeriod(),
            week: emptyPeriod(),
            twoWeeks: emptyPeriod(),
            month: emptyPeriod()
        };
        const byItem = new Map();

        const ensureItem = (line) => {
            const itemId = line.itemId;
            if (!byItem.has(itemId)) {
                byItem.set(itemId, {
                    itemId,
                    name: line.item?.name || "Unknown Item",
                    category: line.item?.category || "دیگر",
                    unit: line.item?.default_unit || line.unit || "",
                    lastDate: line.entry.date,
                    day: emptyPeriod(),
                    custom: emptyPeriod(),
                    week: emptyPeriod(),
                    twoWeeks: emptyPeriod(),
                    month: emptyPeriod()
                });
            }

            const item = byItem.get(itemId);
            if (line.entry.date > item.lastDate) item.lastDate = line.entry.date;
            return item;
        };

        for (const line of validLines) {
            const date = line.entry.date;
            if (date > reportDate) continue;

            const quantity = Number(line.quantity_in_base_unit ?? line.quantity ?? 0);
            const amount = Number(line.total_price ?? 0);
            const item = ensureItem(line);

            if (date === reportDate) {
                addToPeriod(item.day, quantity, amount);
                addToPeriod(totals.day, quantity, amount);
            }

            if (date >= customStart) {
                addToPeriod(item.custom, quantity, amount);
                addToPeriod(totals.custom, quantity, amount);
            }

            if (date >= weekStart) {
                addToPeriod(item.week, quantity, amount);
                addToPeriod(totals.week, quantity, amount);
            }

            if (date >= twoWeeksStart) {
                addToPeriod(item.twoWeeks, quantity, amount);
                addToPeriod(totals.twoWeeks, quantity, amount);
            }

            if (date >= monthStart) {
                addToPeriod(item.month, quantity, amount);
                addToPeriod(totals.month, quantity, amount);
            }
        }

        const items = Array.from(byItem.values())
            .map(item => ({
                ...item,
                day: serializePeriod(item.day),
                custom: serializePeriod(item.custom),
                week: serializePeriod(item.week),
                twoWeeks: serializePeriod(item.twoWeeks),
                month: serializePeriod(item.month)
            }))
            .filter(item => item.month.amount > 0 || item.twoWeeks.amount > 0 || item.week.amount > 0 || item.custom.amount > 0 || item.day.amount > 0)
            .sort((a, b) => b.month.amount - a.month.amount || a.name.localeCompare(b.name));

        return {
            reportDate,
            customDays,
            ranges,
            totals: {
                day: serializePeriod(totals.day),
                custom: serializePeriod(totals.custom),
                week: serializePeriod(totals.week),
                twoWeeks: serializePeriod(totals.twoWeeks),
                month: serializePeriod(totals.month)
            },
            items
        };
    } catch (e) {
        console.error(e);
        return {
            reportDate: null,
            customDays,
            ranges: null,
            totals: {
                day: emptyPeriod(),
                custom: emptyPeriod(),
                week: emptyPeriod(),
                twoWeeks: emptyPeriod(),
                month: emptyPeriod()
            },
            items: []
        };
    }
}

// Get the latest price of each item at each store
export async function getPriceComparison() {
    try {
        const lines = await prisma.purchaseLine.findMany({
            include: {
                item: true,
                store: true,
                entry: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const latestPrices = [];
        const seen = new Set();

        for (const line of lines) {
            const key = `${line.itemId}-${line.storeId}`;
            if (!seen.has(key)) {
                seen.add(key);
                latestPrices.push(line);
            }
        }

        return latestPrices;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getItemPriceIntelligence(itemId) {
    try {
        // Fetch recent purchases for this item
        const lines = await prisma.purchaseLine.findMany({
            where: { itemId: parseInt(itemId) },
            include: { entry: true, store: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (lines.length === 0) return null;

        // Group by store to get last price per store
        const lastByStore = {};
        for (const l of lines) {
            if (!lastByStore[l.storeId]) {
                lastByStore[l.storeId] = {
                    price: l.unit_price_per_base_unit || l.unit_price,
                    date: l.entry.date
                };
            }
        }

        // Find absolute lowest recent price
        let lowestPrice = lines[0].unit_price_per_base_unit || lines[0].unit_price;
        for (const l of lines) {
            const price = l.unit_price_per_base_unit || l.unit_price;
            if (price < lowestPrice) lowestPrice = price;
        }

        return {
            lastByStore,
            lowestRecentPrice: lowestPrice,
            baseUnit: lines[0].item ? lines[0].item.default_unit : lines[0].unit
        };
    } catch (e) {
        return null;
    }
}

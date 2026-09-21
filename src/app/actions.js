"use server"

import { prisma } from "../lib/prisma"
import { revalidatePath } from "next/cache"
import {
    clearAuthCookie,
    ensureAdminUser,
    getCurrentUser,
    getPrimaryAdminId,
    getUserRole,
    hashPassword,
    requireAdminUser,
    requireDataEntryUser,
    setAuthCookie,
    USER_ROLES,
    verifyPassword,
} from "../lib/auth"

export async function loginUser(formData) {
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
        return { success: false, error: "یوزرنیم اور پاس ورڈ دونوں درج کریں۔" };
    }

    try {
        await ensureAdminUser();
    } catch (error) {
        console.error("Login setup error:", error);
        return { success: false, error: "Login setup مکمل نہیں ہے۔ Vercel پر AUTH_SECRET اور ADMIN_PASSWORD ضرور set کریں۔" };
    }

    const user = await prisma.adminUser.findUnique({
        where: { username },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
        return { success: false, error: "یوزرنیم یا پاس ورڈ درست نہیں ہے۔" };
    }

    await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });

    const role = await getUserRole(user.id);

    try {
        await setAuthCookie({ ...user, role });
    } catch (error) {
        console.error("Session setup error:", error);
        return { success: false, error: "Session setup مکمل نہیں ہے۔ AUTH_SECRET check کریں۔" };
    }

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role,
        },
    };
}

export async function logoutUser() {
    await clearAuthCookie();
    return { success: true };
}

export async function changeAdminPassword(formData) {
    const { user: currentUser, error: authError } = await requireAdminUser();
    if (authError) return authError;

    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { success: false, error: "تمام password fields مکمل کریں۔" };
    }

    if (newPassword.length < 6) {
        return { success: false, error: "نیا پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔" };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: "نیا پاس ورڈ اور confirm password ایک جیسے نہیں ہیں۔" };
    }

    const user = await prisma.adminUser.findUnique({
        where: { id: currentUser.id },
    });

    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        return { success: false, error: "موجودہ پاس ورڈ درست نہیں ہے۔" };
    }

    await prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword) },
    });

    return { success: true, message: "پاس ورڈ کامیابی سے تبدیل ہو گیا۔" };
}

function serializeAccountUser(user, primaryAdminId) {
    return {
        id: user.id,
        username: user.username,
        role: user.id === primaryAdminId ? USER_ROLES.ADMIN : USER_ROLES.STAFF,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    };
}

export async function getAccountUsers() {
    const { error: authError } = await requireAdminUser();
    if (authError) return { success: false, users: [], error: authError.error };

    const primaryAdminId = await getPrimaryAdminId();
    const users = await prisma.adminUser.findMany({
        orderBy: { id: "asc" },
        select: {
            id: true,
            username: true,
            lastLoginAt: true,
            createdAt: true,
        },
    });

    return {
        success: true,
        users: users.map((user) => serializeAccountUser(user, primaryAdminId)),
    };
}

export async function createStaffUser(formData) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    const username = String(formData.get("staffUsername") || "").trim();
    const password = String(formData.get("staffPassword") || "");
    const confirmPassword = String(formData.get("staffConfirmPassword") || "");

    if (!username || !password || !confirmPassword) {
        return { success: false, error: "Staff username اور password مکمل درج کریں۔" };
    }

    if (username.length < 3) {
        return { success: false, error: "Username کم از کم 3 حروف کا ہونا چاہیے۔" };
    }

    if (password.length < 6) {
        return { success: false, error: "Password کم از کم 6 حروف کا ہونا چاہیے۔" };
    }

    if (password !== confirmPassword) {
        return { success: false, error: "Password اور confirm password ایک جیسے نہیں ہیں۔" };
    }

    const existing = await prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
        return { success: false, error: "یہ username پہلے سے موجود ہے۔ دوسرا username رکھیں۔" };
    }

    const user = await prisma.adminUser.create({
        data: {
            username,
            passwordHash: hashPassword(password),
        },
        select: {
            id: true,
            username: true,
            lastLoginAt: true,
            createdAt: true,
        },
    });

    revalidatePath("/settings");
    return {
        success: true,
        message: "Staff login بن گیا۔",
        user: serializeAccountUser(user, await getPrimaryAdminId()),
    };
}

async function getEditableStaffUser(userId) {
    const id = parseInt(userId, 10);
    if (!Number.isFinite(id)) return { error: "User درست نہیں ہے۔" };

    const primaryAdminId = await getPrimaryAdminId();
    if (id === primaryAdminId) {
        return { error: "Primary admin account کو staff action سے تبدیل نہیں کیا جا سکتا۔" };
    }

    const user = await prisma.adminUser.findUnique({
        where: { id },
        select: { id: true, username: true },
    });

    if (!user) return { error: "Staff user نہیں ملا۔" };
    return { user };
}

export async function resetStaffPassword(userId, formData) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    const { user, error } = await getEditableStaffUser(userId);
    if (error) return { success: false, error };

    const password = String(formData.get("newStaffPassword") || "");
    if (password.length < 6) {
        return { success: false, error: "نیا password کم از کم 6 حروف کا ہونا چاہیے۔" };
    }

    await prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
    });

    return { success: true, message: `${user.username} کا password تبدیل ہو گیا۔` };
}

export async function deleteStaffUser(userId) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    const { user, error } = await getEditableStaffUser(userId);
    if (error) return { success: false, error };

    await prisma.adminUser.delete({ where: { id: user.id } });
    revalidatePath("/settings");

    return { success: true, message: `${user.username} staff login حذف ہو گیا۔` };
}

function parseDailyEntryForm(formData) {
    const date = formData.get("date")
    const sale_total = parseFloat(formData.get("sales")) || 0
    const purchase_total = parseFloat(formData.get("purchases")) || 0
    const expense_total = parseFloat(formData.get("expenses")) || 0
    const profit_total = sale_total - (purchase_total + expense_total)

    const [yearStr, monthStr] = date.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    return {
        date,
        monthStr,
        data: {
            date,
            month,
            year,
            sale_total,
            purchase_total,
            expense_total,
            profit_total,
        }
    }
}

function serializeDailyEntry(entry) {
    if (!entry) return null

    return {
        id: entry.id,
        date: entry.date,
        sale_total: entry.sale_total,
        purchase_total: entry.purchase_total,
        expense_total: entry.expense_total,
        profit_total: entry.profit_total,
        extra_expense_total: entry.extra_expense_total,
        extra_expense_reason: entry.extra_expense_reason,
    }
}

export async function createEntry(formData, overwriteExisting = false) {
    const { error: authError } = await requireDataEntryUser();
    if (authError) return authError;

    const { date, monthStr, data } = parseDailyEntryForm(formData)

    // Check if an entry already exists for this date
    const existing = await prisma.dailyEntry.findFirst({
        where: { date }
    })

    if (existing && !overwriteExisting) {
        const formattedDate = new Date(date).toLocaleDateString('ur-PK');
        return {
            success: false,
            duplicate: true,
            error: `${formattedDate} کی انٹری پہلے سے موجود ہے`,
            existing: serializeDailyEntry(existing)
        }
    }

    if (existing && overwriteExisting) {
        await prisma.dailyEntry.update({
            where: { id: existing.id },
            data
        })

        revalidatePath("/records")
        revalidatePath("/dashboard")
        revalidatePath(`/monthly/${data.year}/${monthStr}`)
        return { success: true, updated: true }
    }

    await prisma.dailyEntry.create({ data })

    revalidatePath("/records")
    revalidatePath("/dashboard")
    revalidatePath(`/monthly/${data.year}/${monthStr}`)
    return { success: true }
}

export async function updateEntry(id, formData) {
    const { error: authError } = await requireDataEntryUser();
    if (authError) return authError;

    const date = formData.get("date")
    const sale_total = parseFloat(formData.get("sales")) || 0
    const purchase_total = parseFloat(formData.get("purchases")) || 0
    const expense_total = parseFloat(formData.get("expenses")) || 0
    const profit_total = sale_total - (purchase_total + expense_total)

    // Parse year and month from date
    const [yearStr, monthStr] = date.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    await prisma.dailyEntry.update({
        where: { id: parseInt(id) },
        data: {
            date,
            month,
            year,
            sale_total,
            purchase_total,
            expense_total,
            profit_total,
        }
    })

    revalidatePath("/records")
    revalidatePath("/dashboard")
    revalidatePath(`/monthly/${year}/${monthStr}`)
    return { success: true }
}

export async function deleteEntry(id) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    const entry = await prisma.dailyEntry.findUnique({ where: { id: parseInt(id) } });
    if (entry) {
        await prisma.dailyEntry.delete({
            where: { id: parseInt(id) }
        })
        const monthStr = entry.month.toString().padStart(2, '0');
        revalidatePath(`/monthly/${entry.year}/${monthStr}`);
    }
    revalidatePath("/records")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function getEntries() {
    return await prisma.dailyEntry.findMany({
        orderBy: { date: 'desc' }
    })
}

export async function getEntryById(id) {
    return await prisma.dailyEntry.findUnique({
        where: { id: parseInt(id) }
    })
}

export async function getEntriesByMonth(year, month) {
    return await prisma.dailyEntry.findMany({
        where: {
            year: parseInt(year, 10),
            month: parseInt(month, 10),
        },
        orderBy: { date: 'desc' }
    })
}

export async function importCsvEntries(entries, overwrite = false) {
    const { error: authError } = await requireDataEntryUser();
    if (authError) return authError;

    try {
        const datesInCsv = entries.map(e => e.date);

        // Find existing entries for the dates being imported
        const existingEntries = await prisma.dailyEntry.findMany({
            where: {
                date: { in: datesInCsv }
            },
            select: { id: true, date: true }
        });

        const existingDates = new Set(existingEntries.map(e => e.date));

        if (!overwrite && existingDates.size > 0) {
            // Filter out entries that already exist
            entries = entries.filter(e => !existingDates.has(e.date));
            if (entries.length === 0) {
                return { success: false, error: "تمام تاریخوں کا ریکارڈ پہلے سے موجود ہے۔ 'اوور رائٹ کریں' چیک کر کے دوبارہ کوشش کریں۔" };
            }
        } else if (overwrite && existingDates.size > 0) {
            // Delete existing records to overwrite them
            await prisma.dailyEntry.deleteMany({
                where: { date: { in: Array.from(existingDates) } }
            });
        }

        await prisma.dailyEntry.createMany({
            data: entries
        });

        revalidatePath("/records");
        revalidatePath("/dashboard");
        revalidatePath("/monthly");
        revalidatePath("/reports");

        // Revalidate specific month pages based on the distinct months in entries
        const uniqueMonths = new Set(entries.map(e => `${e.year}-${e.month.toString().padStart(2, '0')}`));
        uniqueMonths.forEach(ym => {
            const [y, m] = ym.split('-');
            revalidatePath(`/monthly/${y}/${m}`);
        });

        return { success: true };
    } catch (error) {
        console.error("Error importing CSV:", error);
        return { success: false, error: "Database error during import" };
    }
}

export async function getEntryByDate(date) {
    return await prisma.dailyEntry.findFirst({
        where: { date }
    })
}

export async function importPastedData(pastedText, saveValid = false) {
    const { error: authError } = await requireDataEntryUser();
    if (authError) return authError;

    try {
        const lines = pastedText.split('\n');
        let duplicateCount = 0;
        let errorCount = 0;
        let successCount = 0;
        let errors = [];
        let validEntries = [];
        let totalExtraExpenseAdded = 0;
        let totalLinesParsed = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const line = lines[i].trim();

            if (!line) continue; // EMPTY_LINE

            totalLinesParsed++;

            if (line.includes("خریداری") || line.includes("تاریخ") || line.includes("کس مد میں") || line.includes("اضافی اخراجات") || line.includes("روزنامچہ")) {
                continue; // HEADER_LINE
            }

            const tokens = line.split(/\s+/);
            if (tokens.length < 5) {
                errorCount++;
                errors.push({
                    lineNumber,
                    rawLine: line,
                    errorCode: 'COLUMN_MISSING',
                    messageUrdu: 'لائن میں کالمز پورے نہیں ہیں۔',
                    expectedFormat: 'کم از کم: خریداری، سیل، دن، تاریخ کے 3 حصے',
                    extractedColumns: tokens
                });
                continue;
            }

            // Find Date: could be 3 tokens ('28 November 2025') or 1 token ('2026-01-01')
            let parsedDateObj = null;
            let dateTokensCount = 0;

            let dateRawStr3 = tokens.slice(-3).join(" ");
            let d3 = new Date(dateRawStr3);

            let dateRawStr1 = tokens.slice(-1)[0];
            let d1 = new Date(dateRawStr1);

            if (!isNaN(d3.getTime())) {
                parsedDateObj = d3;
                dateTokensCount = 3;
            } else if (!isNaN(d1.getTime())) {
                parsedDateObj = d1;
                dateTokensCount = 1;
            } else {
                errorCount++;
                errors.push({
                    lineNumber,
                    rawLine: line,
                    errorCode: 'DATE_PARSE_ERROR',
                    messageUrdu: 'تاریخ کا فارمیٹ درست نہیں، یا تاریخ پہچانی نہیں جا سکی۔',
                    expectedFormat: 'مثال: 1 January 2026',
                    extractedColumns: tokens
                });
                continue;
            }

            const otherTokens = tokens.slice(0, tokens.length - dateTokensCount);
            if (otherTokens.length < 3) {
                errorCount++;
                errors.push({
                    lineNumber,
                    rawLine: line,
                    errorCode: 'COLUMN_MISSING',
                    messageUrdu: 'تاریخ کے علاوہ سیل، خریداری اور دن کا ہونا لازمی ہے۔',
                    expectedFormat: 'خریداری | سیل | دن',
                    extractedColumns: otherTokens
                });
                continue;
            }

            const day_text = otherTokens[otherTokens.length - 1];
            const saleStr = otherTokens[otherTokens.length - 2];
            const purchaseStr = otherTokens[otherTokens.length - 3];

            let extra_expense_total = 0;
            let extra_expense_reason = "";

            if (otherTokens.length > 3) {
                const extraTokens = otherTokens.slice(0, otherTokens.length - 3);
                let possibleExtraStr = extraTokens[extraTokens.length - 1];
                let parsedExtra = parseFloat(possibleExtraStr);
                if (!isNaN(parsedExtra)) {
                    extra_expense_total = parsedExtra;
                    extra_expense_reason = extraTokens.slice(0, extraTokens.length - 1).join(" ");
                } else {
                    extra_expense_reason = extraTokens.join(" ");
                }
            }

            const purchase_total = parseFloat(purchaseStr);
            const sale_total = parseFloat(saleStr);

            if (isNaN(purchase_total) || isNaN(sale_total)) {
                errorCount++;
                errors.push({
                    lineNumber,
                    rawLine: line,
                    errorCode: 'NUMBER_PARSE_ERROR',
                    messageUrdu: 'سیل یا خریداری کی رقم درست نمبر (Number) نہیں ہے۔',
                    expectedFormat: 'رقم نمبرز میں ہونی چاہیے (مثال: 12.5)',
                    extractedColumns: [purchaseStr, saleStr]
                });
                continue;
            }

            const yyyy = parsedDateObj.getFullYear();
            const mm = parsedDateObj.getMonth() + 1;
            const dd = String(parsedDateObj.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${String(mm).padStart(2, '0')}-${dd}`;

            validEntries.push({
                lineNumber,
                rawLine: line,
                entry: {
                    date: formattedDate,
                    day_text: day_text,
                    month: mm,
                    year: yyyy,
                    sale_total,
                    purchase_total,
                    expense_total: 0,
                    profit_total: sale_total - purchase_total,
                    extra_expense_total,
                    extra_expense_reason
                }
            });
        }

        const finalNewEntries = [];
        const existingDatesFound = new Set();

        if (validEntries.length > 0) {
            const datesInInput = validEntries.map(e => e.entry.date);
            const existingDBEntries = await prisma.dailyEntry.findMany({
                where: { date: { in: datesInInput } },
                select: { date: true }
            });
            const existingDatesDB = new Set(existingDBEntries.map(e => e.date));

            for (let item of validEntries) {
                if (existingDatesDB.has(item.entry.date)) {
                    duplicateCount++;
                    errors.push({
                        lineNumber: item.lineNumber,
                        rawLine: item.rawLine,
                        errorCode: 'DUPLICATE_DATE',
                        messageUrdu: `اس تاریخ (${item.entry.date}) کا ریکارڈ پہلے ہی محفوظ ہے۔`,
                        expectedFormat: 'تاریخ منفرد (Unique) ہونی چاہیے',
                        extractedColumns: [item.entry.date]
                    });
                } else if (existingDatesFound.has(item.entry.date)) {
                    duplicateCount++;
                    errors.push({
                        lineNumber: item.lineNumber,
                        rawLine: item.rawLine,
                        errorCode: 'DUPLICATE_DATE_IN_TEXT',
                        messageUrdu: `اس تاریخ (${item.entry.date}) کی ایک اور لائن اوپر موجود تھی۔ وہ محفوظ ہو گی، یہ نہیں۔`,
                        expectedFormat: 'ہر لائن کی تاریخ مختلف ہو',
                        extractedColumns: [item.entry.date]
                    });
                } else {
                    existingDatesFound.add(item.entry.date);
                    finalNewEntries.push(item.entry);
                }
            }
        }

        if (saveValid && finalNewEntries.length > 0) {
            totalExtraExpenseAdded = finalNewEntries.reduce((sum, e) => sum + (e.extra_expense_total || 0), 0);
            await prisma.dailyEntry.createMany({
                data: finalNewEntries
            });

            revalidatePath("/records");
            revalidatePath("/dashboard");
            revalidatePath("/monthly");
            revalidatePath("/reports");

            const uniqueMonths = new Set(finalNewEntries.map(e => `${e.year}-${e.month.toString().padStart(2, '0')}`));
            uniqueMonths.forEach(ym => {
                const [y, m] = ym.split('-');
                revalidatePath(`/monthly/${y}/${m}`);
            });
        }

        successCount = finalNewEntries.length;

        // "If some lines succeed and some fail: Save valid lines (by default)... Add buttons: 'صرف درست لائنیں محفوظ کریں' (save valid lines even if some fail)". 
        // We handle this directly by accepting saveValid.
        return {
            success: true,
            totalLinesParsed,
            successCount,
            duplicateCount,
            errorCount,
            errors,
            totalExtraExpenseAdded,
            isSaved: saveValid
        };
    } catch (error) {
        console.error("Error importing parsed data:", error);
        return { success: false, error: "ڈیٹا امپورٹ کرتے وقت ڈیٹا بیس کی خرابی پیدا ہو گئی۔" };
    }
}

export async function getMonthlySettings(year, month) {
    try {
        const settings = await prisma.monthlySettings.findUnique({
            where: {
                year_month: {
                    year: parseInt(year, 10),
                    month: parseInt(month, 10),
                }
            }
        });
        return settings ? settings : { include_prev_profit: false };
    } catch (error) {
        console.error("Error fetching monthly settings:", error);
        return { include_prev_profit: false };
    }
}

export async function updateMonthlySettings(year, month, include_prev_profit) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);

        await prisma.monthlySettings.upsert({
            where: {
                year_month: { year: y, month: m }
            },
            update: {
                include_prev_profit
            },
            create: {
                year: y,
                month: m,
                include_prev_profit
            }
        });

        revalidatePath(`/monthly/${year}/${month.toString().padStart(2, '0')}`);
        // Also revalidate the generic monthly route since it caches
        revalidatePath(`/monthly`);

        return { success: true };
    } catch (error) {
        console.error("Error updating monthly settings:", error);
        return { success: false, error: "ترتیبات محفوظ کرتے وقت خرابی پیدا ہو گئی۔" };
    }
}

function serializeMonthlyExpense(expense) {
    return {
        id: expense.id,
        year: expense.year,
        month: expense.month,
        title: expense.title,
        amount: expense.amount,
        notes: expense.notes,
    }
}

function parseMonthlyExpenseForm(year, month, formData) {
    const title = String(formData.get("title") || "").trim();
    const amount = parseFloat(formData.get("amount"));
    const notes = String(formData.get("notes") || "").trim();
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (!title) {
        return { error: "خرچ کا نام لازمی درج کریں۔" };
    }

    if (Number.isNaN(amount) || amount < 0) {
        return { error: "رقم درست نمبر میں درج کریں۔" };
    }

    return {
        data: {
            year: y,
            month: m,
            title,
            amount,
            notes: notes || null,
        },
        monthPath: `/monthly/${y}/${String(m).padStart(2, "0")}`,
    };
}

export async function getMonthlyExpenses(year, month) {
    try {
        const expenses = await prisma.monthlyExpense.findMany({
            where: {
                year: parseInt(year, 10),
                month: parseInt(month, 10),
            },
            orderBy: { id: "asc" },
        });

        return expenses.map(serializeMonthlyExpense);
    } catch (error) {
        console.error("Error fetching monthly expenses:", error);
        return [];
    }
}

export async function addMonthlyExpense(year, month, formData) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        const parsed = parseMonthlyExpenseForm(year, month, formData);
        if (parsed.error) return { success: false, error: parsed.error };

        const expense = await prisma.monthlyExpense.create({
            data: parsed.data,
        });

        revalidatePath("/monthly");
        revalidatePath(parsed.monthPath);

        return { success: true, expense: serializeMonthlyExpense(expense) };
    } catch (error) {
        console.error("Error adding monthly expense:", error);
        return { success: false, error: "ماہانہ خرچ محفوظ کرتے وقت خرابی پیدا ہو گئی۔" };
    }
}

export async function updateMonthlyExpense(id, year, month, formData) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        const parsed = parseMonthlyExpenseForm(year, month, formData);
        if (parsed.error) return { success: false, error: parsed.error };

        const expense = await prisma.monthlyExpense.update({
            where: { id: parseInt(id, 10) },
            data: parsed.data,
        });

        revalidatePath("/monthly");
        revalidatePath(parsed.monthPath);

        return { success: true, expense: serializeMonthlyExpense(expense) };
    } catch (error) {
        console.error("Error updating monthly expense:", error);
        return { success: false, error: "ماہانہ خرچ تبدیل کرتے وقت خرابی پیدا ہو گئی۔" };
    }
}

export async function deleteMonthlyExpense(id, year, month) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);

        await prisma.monthlyExpense.delete({
            where: { id: parseInt(id, 10) },
        });

        revalidatePath("/monthly");
        revalidatePath(`/monthly/${y}/${String(m).padStart(2, "0")}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting monthly expense:", error);
        return { success: false, error: "ماہانہ خرچ حذف کرتے وقت خرابی پیدا ہو گئی۔" };
    }
}

function toPlainJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function withCreatedAt(row) {
    if (!row?.createdAt) return row;
    return { ...row, createdAt: new Date(row.createdAt) };
}

export async function exportBackupData() {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        const [
            dailyEntries,
            monthlySettings,
            monthlyExpenses,
            stores,
            items,
            purchaseEntries,
            purchaseLines,
        ] = await Promise.all([
            prisma.dailyEntry.findMany({ orderBy: { id: "asc" } }),
            prisma.monthlySettings.findMany({ orderBy: { id: "asc" } }),
            prisma.monthlyExpense.findMany({ orderBy: { id: "asc" } }),
            prisma.store.findMany({ orderBy: { id: "asc" } }),
            prisma.item.findMany({ orderBy: { id: "asc" } }),
            prisma.purchaseEntry.findMany({ orderBy: { id: "asc" } }),
            prisma.purchaseLine.findMany({ orderBy: { id: "asc" } }),
        ]);

        const backup = {
            app: "malik-sajawal-refreshment",
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
                dailyEntries,
                monthlySettings,
                monthlyExpenses,
                stores,
                items,
                purchaseEntries,
                purchaseLines,
            },
        };

        return { success: true, backup: toPlainJson(backup) };
    } catch (error) {
        console.error("Error exporting backup:", error);
        return { success: false, error: "Backup بناتے وقت خرابی پیدا ہو گئی۔" };
    }
}

export async function restoreBackupData(backup) {
    const { error: authError } = await requireAdminUser();
    if (authError) return authError;

    try {
        if (!backup || backup.app !== "malik-sajawal-refreshment" || !backup.data) {
            return { success: false, error: "Backup file درست نہیں ہے۔" };
        }

        const data = backup.data;

        const dailyEntries = ensureArray(data.dailyEntries).map(withCreatedAt);
        const monthlySettings = ensureArray(data.monthlySettings);
        const monthlyExpenses = ensureArray(data.monthlyExpenses).map(withCreatedAt);
        const stores = ensureArray(data.stores).map(withCreatedAt);
        const items = ensureArray(data.items).map(withCreatedAt);
        const purchaseEntries = ensureArray(data.purchaseEntries).map(withCreatedAt);
        const purchaseLines = ensureArray(data.purchaseLines).map(withCreatedAt);

        await prisma.$transaction(async (tx) => {
            await tx.purchaseLine.deleteMany();
            await tx.purchaseEntry.deleteMany();
            await tx.monthlyExpense.deleteMany();
            await tx.monthlySettings.deleteMany();
            await tx.dailyEntry.deleteMany();
            await tx.store.deleteMany();
            await tx.item.deleteMany();

            if (dailyEntries.length > 0) await tx.dailyEntry.createMany({ data: dailyEntries });
            if (monthlySettings.length > 0) await tx.monthlySettings.createMany({ data: monthlySettings });
            if (monthlyExpenses.length > 0) await tx.monthlyExpense.createMany({ data: monthlyExpenses });
            if (stores.length > 0) await tx.store.createMany({ data: stores });
            if (items.length > 0) await tx.item.createMany({ data: items });
            if (purchaseEntries.length > 0) await tx.purchaseEntry.createMany({ data: purchaseEntries });
            if (purchaseLines.length > 0) await tx.purchaseLine.createMany({ data: purchaseLines });
        });

        revalidatePath("/");
        revalidatePath("/dashboard");
        revalidatePath("/monthly");
        revalidatePath("/records");
        revalidatePath("/reports");
        revalidatePath("/purchases");
        revalidatePath("/items");
        revalidatePath("/stores");
        revalidatePath("/price-compare");

        return {
            success: true,
            counts: {
                dailyEntries: dailyEntries.length,
                monthlySettings: monthlySettings.length,
                monthlyExpenses: monthlyExpenses.length,
                stores: stores.length,
                items: items.length,
                purchaseEntries: purchaseEntries.length,
                purchaseLines: purchaseLines.length,
            },
        };
    } catch (error) {
        console.error("Error restoring backup:", error);
        return { success: false, error: "Backup restore کرتے وقت خرابی پیدا ہو گئی۔" };
    }
}

export async function getLast6MonthsSummary() {
    try {
        const aggregated = await prisma.dailyEntry.groupBy({
            by: ['year', 'month'],
            _sum: {
                sale_total: true,
                purchase_total: true,
                expense_total: true,
                profit_total: true,
                extra_expense_total: true,
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            take: 6,
        });
        return aggregated;
    } catch (error) {
        console.error("Error fetching 6 months summary:", error);
        return [];
    }
}

export async function getLatestDashboardEntry() {
    try {
        const entry = await prisma.dailyEntry.findFirst({
            orderBy: { date: "desc" },
            select: {
                id: true,
                date: true,
                sale_total: true,
                purchase_total: true,
                expense_total: true,
                profit_total: true,
                extra_expense_total: true,
            },
        });

        const purchaseEntry = entry
            ? await prisma.purchaseEntry.findUnique({
                where: { date: entry.date },
                select: { id: true },
            })
            : null;

        return entry
            ? {
                id: entry.id,
                date: entry.date,
                purchaseEntryId: purchaseEntry?.id || null,
                sale_total: entry.sale_total,
                purchase_total: entry.purchase_total,
                expense_total: entry.expense_total,
                profit_total: entry.profit_total,
                extra_expense_total: entry.extra_expense_total,
            }
            : null;
    } catch (error) {
        console.error("Error fetching latest dashboard entry:", error);
        return null;
    }
}

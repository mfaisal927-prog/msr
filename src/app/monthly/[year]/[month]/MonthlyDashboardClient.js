"use client";
import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addMonthlyExpense, deleteMonthlyExpense, updateMonthlyExpense, updateMonthlySettings } from "../../../actions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Download, FileText, Plus, List, Upload, ClipboardPaste } from 'lucide-react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatOMR } from "../../../../lib/formatMoney";

export default function MonthlyDashboardClient({ year, month, totals, prevMonthProfit, initialSettings, initialMonthlyExpenses = [], entries = [] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [monthlyExpenses, setMonthlyExpenses] = useState(initialMonthlyExpenses);
    const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", notes: "" });
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [expenseError, setExpenseError] = useState("");
    const [expenseSubmitting, setExpenseSubmitting] = useState(false);
    const monthlyExpenseSectionRef = useRef(null);
    const monthlyExpenseTitleRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setMonthlyExpenses(initialMonthlyExpenses);
    }, [initialMonthlyExpenses]);

    const monthLabels = {
        "01": "جنوری", "02": "فروری", "03": "مارچ", "04": "اپریل",
        "05": "مئی", "06": "جون", "07": "جولائی", "08": "اگست",
        "09": "ستمبر", "10": "اکتوبر", "11": "نومبر", "12": "دسمبر",
    };
    const currentMonthLabel = `${monthLabels[month]} ${year}`;

    const navigateTo = (path) => router.push(path);

    const handleToggleSetting = async (e) => {
        const newValue = e.target.checked;
        startTransition(() => {
            updateMonthlySettings(year, month, newValue);
        });
    };

    const isOptionOn = initialSettings?.include_prev_profit || false;

    const resetExpenseForm = () => {
        setExpenseForm({ title: "", amount: "", notes: "" });
        setEditingExpenseId(null);
        setExpenseError("");
    };

    const handleExpenseFormChange = (field, value) => {
        setExpenseForm(prev => ({ ...prev, [field]: value }));
        setExpenseError("");
    };

    const buildExpenseFormData = () => {
        const formData = new FormData();
        formData.append("title", expenseForm.title);
        formData.append("amount", expenseForm.amount);
        formData.append("notes", expenseForm.notes);
        return formData;
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setExpenseSubmitting(true);
        setExpenseError("");

        const response = editingExpenseId
            ? await updateMonthlyExpense(editingExpenseId, year, month, buildExpenseFormData())
            : await addMonthlyExpense(year, month, buildExpenseFormData());

        if (!response.success) {
            setExpenseError(response.error || "ماہانہ خرچ محفوظ نہیں ہو سکا۔");
            setExpenseSubmitting(false);
            return;
        }

        setMonthlyExpenses(prev => {
            if (editingExpenseId) {
                return prev.map(item => item.id === response.expense.id ? response.expense : item);
            }
            return [...prev, response.expense];
        });

        resetExpenseForm();
        setExpenseSubmitting(false);
    };

    const handleEditExpense = (expense) => {
        setEditingExpenseId(expense.id);
        setExpenseForm({
            title: expense.title,
            amount: expense.amount.toString(),
            notes: expense.notes || "",
        });
        setExpenseError("");
        monthlyExpenseSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => monthlyExpenseTitleRef.current?.focus(), 250);
    };

    const openMonthlyExpenses = () => {
        monthlyExpenseSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => monthlyExpenseTitleRef.current?.focus(), 250);
    };

    const handleDeleteExpense = async (expense) => {
        const shouldDelete = window.confirm(`${expense.title} حذف کرنا چاہتے ہیں؟`);
        if (!shouldDelete) return;

        setExpenseSubmitting(true);
        setExpenseError("");

        const response = await deleteMonthlyExpense(expense.id, year, month);
        if (!response.success) {
            setExpenseError(response.error || "ماہانہ خرچ حذف نہیں ہو سکا۔");
            setExpenseSubmitting(false);
            return;
        }

        setMonthlyExpenses(prev => prev.filter(item => item.id !== expense.id));
        if (editingExpenseId === expense.id) resetExpenseForm();
        setExpenseSubmitting(false);
    };

    // Memoize the analytics
    const {
        displayExpenses, displayProfit,
        dailyData, weeklyProfit, maxSaleDayText,
        avgDailySale, totalExtraExpense, monthlyExpenseTotal
    } = useMemo(() => {
        const monthlyExpenseTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        let expenses = totals.expenses + monthlyExpenseTotal;
        let profit = totals.sales - (totals.purchases + expenses);

        if (isOptionOn) {
            expenses = expenses + prevMonthProfit;
            profit = totals.sales - (totals.purchases + expenses);
        }

        // Daily Trend Data sorting
        const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
        const dailyData = sortedEntries.map(e => ({
            dateStr: new Date(e.date).getDate().toString(),
            سیل: e.sale_total,
            منافع: e.profit_total
        }));

        // Weekly Breakdown
        let w1 = 0, w2 = 0, w3 = 0, w4 = 0;

        // Smart Insights Logic
        let maxSale = -1;
        let maxSaleDay = "";
        let totalDays = sortedEntries.length;

        sortedEntries.forEach(e => {
            const dateNum = new Date(e.date).getDate();
            if (dateNum <= 7) w1 += e.profit_total;
            else if (dateNum <= 14) w2 += e.profit_total;
            else if (dateNum <= 21) w3 += e.profit_total;
            else w4 += e.profit_total;

            if (e.sale_total > maxSale) {
                maxSale = e.sale_total;
                maxSaleDay = e.day_text || new Date(e.date).toLocaleDateString('ur-PK', { weekday: 'long' });
            }
        });

        const avgDailySale = totalDays > 0 ? totals.sales / totalDays : 0;

        return {
            displayExpenses: expenses,
            displayProfit: profit,
            dailyData,
            weeklyProfit: [w1, w2, w3, w4],
            maxSaleDayText: maxSaleDay,
            avgDailySale,
            monthlyExpenseTotal,
            totalExtraExpense: entries.reduce((sum, e) => sum + (e.extra_expense_total || 0), 0)
        };
    }, [totals, prevMonthProfit, isOptionOn, entries, monthlyExpenses]);

    const barChartData = [
        { name: 'سیل', sum: totals.sales, fill: '#14532d' },
        { name: 'خریداری', sum: totals.purchases, fill: '#ef4444' },
        { name: 'اخراجات', sum: displayExpenses, fill: '#f59e0b' },
        { name: 'منافع', sum: displayProfit, fill: displayProfit >= 0 ? '#10b981' : '#ef4444' }
    ];

    const weeklyChartData = [
        { name: 'ہفتہ 1', منافع: weeklyProfit[0] },
        { name: 'ہفتہ 2', منافع: weeklyProfit[1] },
        { name: 'ہفتہ 3', منافع: weeklyProfit[2] },
        { name: 'ہفتہ 4+', منافع: weeklyProfit[3] },
    ];

    const handleDownloadCSV = () => {
        const headers = "Date,Day,Sale,Purchase,Expense,Profit\n";
        const rows = entries.map(entry => {
            const dateStr = entry.date;
            const dayStr = entry.day_text || new Date(entry.date).toLocaleDateString('ur-PK', { weekday: 'long' }).replace(/,/g, '');
            return `${dateStr},${dayStr},${formatOMR(entry.sale_total)},${formatOMR(entry.purchase_total)},${formatOMR(entry.expense_total)},${formatOMR(entry.profit_total)}`;
        }).join("\n");

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headers + rows);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `monthly_report_${year}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF('p', 'pt');
        // Simple English/Fallback due to jsPdf urdu limitations without custom font
        // Using basic english table just for export standard. 
        doc.setFontSize(20);
        doc.text(`Monthly Report - ${year}/${month}`, 40, 40);

        doc.setFontSize(12);
        doc.text(`Total Sale: ${formatOMR(totals.sales)} OMR`, 40, 70);
        doc.text(`Total Purchase: ${formatOMR(totals.purchases)} OMR`, 40, 90);
        doc.text(`Total Expense: ${formatOMR(displayExpenses)} OMR`, 40, 110);
        doc.text(`Net Profit: ${formatOMR(displayProfit)} OMR`, 40, 130);
        doc.text(`Monthly Expenses: ${formatOMR(monthlyExpenseTotal)} OMR`, 40, 150);

        const tableColumn = ["Date", "Day", "Sale", "Purchase", "Expense", "Profit"];
        const tableRows = [];

        [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
            const eData = [
                e.date,
                e.day_text || "-",
                formatOMR(e.sale_total),
                formatOMR(e.purchase_total),
                formatOMR(e.expense_total),
                formatOMR(e.profit_total)
            ];
            tableRows.push(eData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 170,
            theme: 'striped',
            headStyles: { fillColor: [20, 83, 45] }
        });

        doc.save(`report_${year}_${month}.pdf`);
    };

    if (!mounted) {
        return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}></div>;
    }

    return (
        <div className="container">
            <div className="dashboard-header animate-slide-up">
                <h1 className="dashboard-title">{currentMonthLabel} کا حساب</h1>
            </div>

            <div className="dashboard-content animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <button className="btn-cancel" style={{ width: 'auto', margin: 0 }} onClick={() => router.push("/monthly")}>
                        &larr; مہینہ تبدیل کریں
                    </button>

                    {/* EXPORT BUTTONS */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-action" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.9rem', gap: '0.5rem' }} onClick={handleDownloadPDF}>
                            <FileText size={18} /> <span>PDF ڈاؤن لوڈ</span>
                        </button>
                        <button className="btn-action" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.9rem', gap: '0.5rem' }} onClick={handleDownloadCSV}>
                            <Download size={18} /> <span>CSV ایکسپورٹ</span>
                        </button>
                    </div>
                </div>

                <div style={{
                    marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--bg-color)',
                    borderRadius: '16px', border: '1px solid var(--border)', display: 'flex',
                    alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '1rem', width: '100%' }}>
                        <div style={{ position: 'relative', display: 'inline-block', width: '48px', height: '28px', flexShrink: 0 }}>
                            <input type="checkbox" checked={isOptionOn} onChange={handleToggleSetting} disabled={isPending} style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: isOptionOn ? 'var(--accent)' : 'var(--text-muted)',
                                transition: '.4s', borderRadius: '34px', opacity: isPending ? 0.5 : 1
                            }}>
                                <span style={{
                                    position: 'absolute', content: '""', height: '20px', width: '20px',
                                    left: isOptionOn ? '24px' : '4px', bottom: '4px',
                                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                }}></span>
                            </span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                پچھلے ماہ کا منافع شامل کریں
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                اس ماہ کے اخراجات میں پچھلے ماہ کا منافع ایڈجسٹ کریں۔
                            </div>
                        </div>
                    </label>
                </div>

                <div className="summary-grid">
                    <button type="button" className="summary-card click-through-card" onClick={() => navigateTo(`/monthly/${year}/${month}/records`)}>
                        <div className="card-title">اس ماہ کی کل سیل</div>
                        <div className="card-value"><span className="card-currency">OMR</span>{formatOMR(totals.sales)}</div>
                    </button>
                    <button type="button" className="summary-card click-through-card" onClick={() => navigateTo(`/purchases`)}>
                        <div className="card-title">کل خریداری</div>
                        <div className="card-value"><span className="card-currency">OMR</span>{formatOMR(totals.purchases)}</div>
                    </button>
                    <button type="button" className="summary-card click-through-card" onClick={() => navigateTo(`/monthly/${year}/${month}/records`)}>
                        <div className="card-title">{isOptionOn ? "ایڈجسٹڈ اخراجات" : "کل اخراجات"}</div>
                        <div className="card-value"><span className="card-currency">OMR</span>{formatOMR(displayExpenses)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            روزانہ: {formatOMR(totals.expenses)} + ماہانہ: {formatOMR(monthlyExpenseTotal)}
                            {isOptionOn ? ` + پچھلا منافع: ${formatOMR(prevMonthProfit)}` : ""}
                        </div>
                    </button>
                    <button type="button" className="summary-card click-through-card" onClick={() => navigateTo(`/monthly/${year}/${month}/records`)}>
                        <div className="card-title">{isOptionOn ? "ایڈجسٹڈ منافع" : "خالص منافع"}</div>
                        <div className={`card-value ${displayProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}><span className="card-currency">OMR</span>{formatOMR(displayProfit)}</div>
                        {isOptionOn && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>اصل منافع: {formatOMR(totals.profit)}</div>}
                    </button>
                </div>

                <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <button type="button" className="summary-card click-through-card" onClick={() => navigateTo(`/monthly/${year}/${month}/records`)} style={{ borderColor: '#f97316', backgroundColor: '#fff7ed', maxWidth: '300px', padding: '1rem 1.25rem' }}>
                            <div className="card-title" style={{ color: '#c2410c' }}>اضافی اخراجات (پرسنل)</div>
                            <div className="card-value" style={{ fontSize: '1.5rem', color: '#ea580c' }}><span className="card-currency" style={{ color: '#ea580c' }}>OMR</span>{formatOMR(totalExtraExpense)}</div>
                        </button>
                        <button type="button" className="summary-card click-through-card" onClick={openMonthlyExpenses} style={{ borderColor: '#0ea5e9', backgroundColor: '#eff6ff', maxWidth: '300px', padding: '1rem 1.25rem' }}>
                            <div className="card-title" style={{ color: '#0369a1' }}>ماہانہ اخراجات</div>
                            <div className="card-value" style={{ fontSize: '1.5rem', color: '#0284c7' }}><span className="card-currency" style={{ color: '#0284c7' }}>OMR</span>{formatOMR(monthlyExpenseTotal)}</div>
                        </button>
                    </div>
                </div>

                <h2 ref={monthlyExpenseSectionRef} style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem', scrollMarginTop: '110px' }}>ماہانہ اخراجات</h2>
                <div className="card" style={{ marginBottom: '2.5rem' }}>
                    {expenseError && (
                        <div className="profit-negative" style={{ padding: '0.85rem', marginBottom: '1rem', backgroundColor: '#fee2e2', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 'bold' }}>
                            {expenseError}
                        </div>
                    )}

                    <form onSubmit={handleExpenseSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end', marginBottom: '1.25rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="monthly-expense-title">خرچ کا نام</label>
                            <input
                                ref={monthlyExpenseTitleRef}
                                id="monthly-expense-title"
                                type="text"
                                className="form-input"
                                placeholder="مثلاً کرایہ، روم، کمیٹی"
                                value={expenseForm.title}
                                onChange={(e) => handleExpenseFormChange("title", e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="monthly-expense-amount">رقم (OMR)</label>
                            <input
                                id="monthly-expense-amount"
                                type="number"
                                step="0.001"
                                min="0"
                                className="form-input numeric-input"
                                placeholder="0.000"
                                value={expenseForm.amount}
                                onChange={(e) => handleExpenseFormChange("amount", e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="monthly-expense-notes">نوٹ</label>
                            <input
                                id="monthly-expense-notes"
                                type="text"
                                className="form-input"
                                placeholder="اختیاری"
                                value={expenseForm.notes}
                                onChange={(e) => handleExpenseFormChange("notes", e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn-save" style={{ width: 'auto', margin: 0 }} disabled={expenseSubmitting}>
                                {expenseSubmitting ? "محفوظ..." : editingExpenseId ? "تبدیل کریں" : "شامل کریں"}
                            </button>
                            {editingExpenseId && (
                                <button type="button" className="btn-cancel" style={{ width: 'auto', margin: 0 }} onClick={resetExpenseForm} disabled={expenseSubmitting}>
                                    منسوخ
                                </button>
                            )}
                        </div>
                    </form>

                    {monthlyExpenses.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                            اس ماہ ابھی کوئی ماہانہ خرچ شامل نہیں کیا گیا۔
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {monthlyExpenses.map(expense => (
                                <div
                                    key={expense.id}
                                    className="click-through-row"
                                    onClick={() => handleEditExpense(expense)}
                                    title="اس ماہانہ خرچ کو edit کریں"
                                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '0.75rem', alignItems: 'center', padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--bg-color)' }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{expense.title}</div>
                                        {expense.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{expense.notes}</div>}
                                    </div>
                                    <div style={{ direction: 'ltr', fontWeight: 800, color: '#0369a1' }}>OMR {formatOMR(expense.amount)}</div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(event) => event.stopPropagation()}>
                                        <button type="button" className="btn-action" style={{ width: 'auto', padding: '0.45rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleEditExpense(expense)} disabled={expenseSubmitting}>
                                            ترمیم
                                        </button>
                                        <button type="button" className="btn-cancel" style={{ width: 'auto', margin: 0, padding: '0.45rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleDeleteExpense(expense)} disabled={expenseSubmitting}>
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SMART INSIGHTS */}
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>کاروباری تجزیہ</h2>
                <div className="card" style={{ marginBottom: '2.5rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'var(--accent)' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1.05rem', fontWeight: '500' }}>
                            <span style={{ color: 'var(--accent)' }}>✦</span>
                            <span>اوسطاً روزانہ کی سیل <strong>{formatOMR(avgDailySale)} OMR</strong> رہی ہے۔</span>
                        </li>
                        <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1.05rem', fontWeight: '500' }}>
                            <span style={{ color: 'var(--accent)' }}>✦</span>
                            {maxSaleDayText ? <span>اس مہینے سب سے زیادہ سیل <strong>{maxSaleDayText}</strong> کے روز ہوئی۔</span> : <span>ابھی سیل کا ریکارڈ موجود نہیں ہے۔</span>}
                        </li>
                        <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1.05rem', fontWeight: '500' }}>
                            <span style={{ color: 'var(--accent)' }}>✦</span>
                            {displayProfit > 0 ? <span>مجموعی طور پر یہ مہینہ <strong>منافع بخش</strong> جا رہا ہے۔</span> : <span>اس مہینے مجموعی طور پر اخراجات سیل سے زیادہ ہیں۔</span>}
                        </li>
                    </ul>
                </div>

                {/* ADVANCED ANALYTICS */}
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>ماہانہ تجزیہ (گرافس)</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

                    {/* Line Chart */}
                    <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
                        <h3 className="card-title">روزانہ کی کارکردگی (سیل بمقابلہ منافع)</h3>
                        <div style={{ flex: 1, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <LineChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="dateStr" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => `${formatOMR(value)} OMR`} contentStyle={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="سیل" stroke="var(--primary)" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="منافع" stroke="var(--accent)" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart Total */}
                    <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
                        <h3 className="card-title">مجموعی موازنہ</h3>
                        <div style={{ flex: 1, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => `${formatOMR(value)} OMR`} cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                    <Bar dataKey="sum" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weekly Breakdown Bar Chart */}
                    <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
                        <h3 className="card-title">ہفتہ وار منافع</h3>
                        <div style={{ flex: 1, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => `${formatOMR(value)} OMR`} cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                    <Bar dataKey="منافع" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>انتظامی روابط</h2>
                <div className="actions-section">
                    <button className="btn-action" onClick={() => navigateTo(`/daily-entry?year=${year}&month=${month}`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Plus size={24} color="var(--accent)" /><span>نئی انٹری کریں</span></div>
                    </button>
                    <button className="btn-action" onClick={() => navigateTo(`/monthly/${year}/${month}/records`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><List size={24} color="var(--accent)" /><span>ریکارڈز دیکھیں</span></div>
                    </button>
                    <button className="btn-action" onClick={() => navigateTo(`/monthly/${year}/${month}/upload`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Upload size={24} color="var(--accent)" /><span>CSV اپلوڈ</span></div>
                    </button>
                    <button className="btn-action" onClick={() => navigateTo(`/monthly/${year}/${month}/paste`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><ClipboardPaste size={24} color="var(--accent)" /><span>ڈیٹا پیسٹ کریں</span></div>
                    </button>
                </div>
            </div>
        </div>
    );
}

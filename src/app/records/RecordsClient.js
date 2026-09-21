"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteEntry } from "../actions";
import { formatOMR } from "../../lib/formatMoney";

export default function RecordsClient({ initialEntries, backPath = "/dashboard", canDelete = true, canExport = true }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter states
    const [month, setMonth] = useState("");
    const [searchDate, setSearchDate] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [sortOrder, setSortOrder] = useState("desc"); // New: sort state

    const handleDelete = async (id) => {
        if (!canDelete) return;

        if (window.confirm("کیا آپ واقعی ڈیلیٹ کرنا چاہتے ہیں؟")) {
            setIsDeleting(true);
            await deleteEntry(id);
            setIsDeleting(false);
        }
    };

    const openEntry = (id) => {
        router.push(`/records/${id}/edit`);
    };

    // Filter entries locally based on selected criteria
    const filteredEntries = initialEntries.filter((entry) => {
        const entryDate = new Date(entry.date);

        // Exact date search
        if (searchDate && entry.date !== searchDate) return false;

        // Month filter
        if (month) {
            // Create YYYY-MM string to compare with month input
            const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
            if (entryMonth !== month) return false;
        }

        // Date range filters
        if (fromDate && entry.date < fromDate) return false;
        if (toDate && entry.date > toDate) return false;

        return true;
    }).sort((a, b) => {
        if (sortOrder === "desc") {
            return new Date(b.date) - new Date(a.date);
        } else {
            return new Date(a.date) - new Date(b.date);
        }
    });

    // Calculate totals for currently filtered entries
    const totals = filteredEntries.reduce((acc, entry) => {
        acc.sale += entry.sale_total;
        acc.purchase += entry.purchase_total;
        acc.expense += entry.expense_total;
        acc.profit += entry.profit_total;
        return acc;
    }, { sale: 0, purchase: 0, expense: 0, profit: 0 });

    const handleDownloadCSV = () => {
        const headers = "Date,Day,Sale,Purchase,Expense,Profit\n";
        const rows = filteredEntries.map(entry => {
            const dateStr = entry.date;
            const dayStr = new Date(entry.date).toLocaleDateString('ur-PK', { weekday: 'long' }).replace(/,/g, '');
            return `${dateStr},${dayStr},${formatOMR(entry.sale_total)},${formatOMR(entry.purchase_total)},${formatOMR(entry.expense_total)},${formatOMR(entry.profit_total)}`;
        }).join("\n");

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headers + rows);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `records_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    if (!mounted) {
        return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}></div>;
    }

    return (
        <div className="records-list animate-slide-up">
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                    className="btn-cancel"
                    style={{ width: 'auto' }}
                    onClick={() => router.push(backPath)}
                >
                    &larr; واپس جائیں
                </button>
            </div>

            <div className="filters-card">
                <h2 style={{ fontSize: '1.125rem', margin: 0 }}>فلٹرز</h2>

                <div className="filters-row">
                    <div className="filter-group">
                        <label htmlFor="month">مہینہ منتخب کریں</label>
                        <input
                            id="month"
                            type="month"
                            className="form-input"
                            value={month}
                            onChange={(e) => {
                                setMonth(e.target.value);
                                // Clear from/to dates when month changes for better UX
                                if (e.target.value) {
                                    setFromDate("");
                                    setToDate("");
                                }
                            }}
                        />
                    </div>

                    <div className="filter-group" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>یا</span>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="searchDate">مخصوص تاریخ</label>
                        <input
                            id="searchDate"
                            type="date"
                            className="form-input"
                            value={searchDate}
                            onChange={(e) => {
                                setSearchDate(e.target.value);
                                if (e.target.value) { setMonth(""); setFromDate(""); setToDate(""); }
                            }}
                        />
                    </div>

                    <div className="filter-group" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>یا</span>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="fromDate">تاریخ سے</label>
                        <input
                            id="fromDate"
                            type="date"
                            className="form-input"
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                if (e.target.value) setMonth("");
                            }}
                        />
                    </div>

                    <div className="filter-group">
                        <label htmlFor="toDate">تاریخ تک</label>
                        <input
                            id="toDate"
                            type="date"
                            className="form-input"
                            value={toDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                if (e.target.value) setMonth("");
                            }}
                        />
                    </div>

                    <button
                        className="btn-cancel"
                        style={{ width: 'auto', padding: '0.75rem 1rem' }}
                        onClick={() => { setMonth(''); setSearchDate(''); setFromDate(''); setToDate(''); }}
                    >
                        ری سیٹ
                    </button>
                </div>
            </div>

            <div className="export-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                {canExport && (
                    <>
                        <button className="btn-save" style={{ flex: 1, backgroundColor: '#3b82f6' }} onClick={handlePrint}>
                            PDF پرنٹ کریں 🖨️
                        </button>
                        <button className="btn-save" style={{ flex: 1, backgroundColor: '#10b981' }} onClick={handleDownloadCSV}>
                            CSV ڈاؤن لوڈ کریں 📥
                        </button>
                    </>
                )}
                <button
                    className="btn-cancel"
                    style={{ height: '100%', padding: '0.875rem 1rem', width: 'auto', backgroundColor: 'var(--card-bg)' }}
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                    ترتیب: {sortOrder === 'desc' ? 'نئی سے پرانی ⬇️' : 'پرانی سے نئی ⬆️'}
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>تاریخ</th>
                            <th>دن</th>
                            <th>سیل</th>
                            <th>خریداری</th>
                            <th>اخراجات</th>
                            <th>بچت/منافع</th>
                            <th>اضافی اخراجات</th>
                            <th>مد</th>
                            <th style={{ textAlign: 'center' }}>ایکشنز</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                    کوئی ریکارڈ موجود نہیں
                                </td>
                            </tr>
                        ) : (
                            filteredEntries.map((entry) => (
                                <tr
                                    key={entry.id}
                                    className="click-through-row"
                                    onClick={() => openEntry(entry.id)}
                                    title="اس ریکارڈ کو کھولیں / edit کریں"
                                >
                                    <td style={{ fontWeight: '600' }}>{new Date(entry.date).toLocaleDateString('ur-PK')}</td>
                                    <td>{new Date(entry.date).toLocaleDateString('ur-PK', { weekday: 'long' })}</td>
                                    <td>
                                        <span className="numeric-input" style={{ float: 'left' }}>{formatOMR(entry.sale_total)} OMR</span>
                                    </td>
                                    <td>
                                        <span className="numeric-input" style={{ float: 'left' }}>{formatOMR(entry.purchase_total)} OMR</span>
                                    </td>
                                    <td>
                                        <span className="numeric-input" style={{ float: 'left' }}>{formatOMR(entry.expense_total)} OMR</span>
                                    </td>
                                    <td style={{ fontWeight: '700' }}>
                                        <span
                                            className={`numeric-input ${entry.profit_total >= 0 ? 'profit-positive' : 'profit-negative'}`}
                                            style={{ float: 'left' }}
                                        >
                                            {formatOMR(entry.profit_total)} OMR
                                        </span>
                                    </td>
                                    <td>
                                        <span className="numeric-input" style={{ float: 'left', color: '#ea580c' }}>{formatOMR(entry.extra_expense_total)} OMR</span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {entry.extra_expense_reason || "-"}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }} onClick={(event) => event.stopPropagation()}>
                                            <button
                                                className="action-btn action-btn-edit"
                                                onClick={() => openEntry(entry.id)}
                                                title="ترمیم کریں"
                                            >
                                                ✎
                                            </button>
                                            {canDelete && (
                                                <button
                                                    className="action-btn action-btn-delete"
                                                    onClick={() => handleDelete(entry.id)}
                                                    disabled={isDeleting}
                                                    title="ڈیلیٹ کریں"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {filteredEntries.length > 0 && (
                        <tfoot>
                            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                <td colSpan="2" style={{ textAlign: 'center' }}>کل میزان</td>
                                <td>
                                    <span className="numeric-input" style={{ float: 'left', fontWeight: 'bold' }}>{formatOMR(totals.sale)} OMR</span>
                                </td>
                                <td>
                                    <span className="numeric-input" style={{ float: 'left', fontWeight: 'bold' }}>{formatOMR(totals.purchase)} OMR</span>
                                </td>
                                <td>
                                    <span className="numeric-input" style={{ float: 'left', fontWeight: 'bold' }}>{formatOMR(totals.expense)} OMR</span>
                                </td>
                                <td>
                                    <span
                                        className={`numeric-input ${totals.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}
                                        style={{ float: 'left', fontWeight: 'bold' }}
                                    >
                                        {formatOMR(totals.profit)} OMR
                                    </span>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

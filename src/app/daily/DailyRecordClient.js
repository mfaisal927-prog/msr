"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEntryByDate, deleteEntry } from "../actions";
import { getPurchaseEntryByDate } from "../purchaseActions";
import { formatOMR } from "../../lib/formatMoney";

export default function DailyRecordClient() {
    const router = useRouter();
    const [searchDate, setSearchDate] = useState("");
    const [entry, setEntry] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchDate) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            const result = await getEntryByDate(searchDate);
            setEntry(result);
        } catch (error) {
            console.error("Error fetching entry:", error);
            setEntry(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("کیا آپ واقعی ڈیلیٹ کرنا چاہتے ہیں؟")) {
            setIsDeleting(true);
            await deleteEntry(id);
            setEntry(null); // Clear the view since it's deleted
            setIsDeleting(false);
        }
    };

    const openEntryEdit = () => {
        if (entry?.id) router.push(`/records/${entry.id}/edit`);
    };

    const openPurchaseForDate = async () => {
        if (!entry?.date) return;
        const purchaseEntry = await getPurchaseEntryByDate(entry.date);
        router.push(purchaseEntry?.id ? `/purchases/${purchaseEntry.id}/edit` : `/purchases/new?date=${entry.date}`);
    };

    return (
        <div className="container">
            <div className="dashboard-header animate-slide-up">
                <h1 className="dashboard-title">روزانہ ریکارڈ تلاش کریں</h1>
                <p className="dashboard-subtitle">کسی بھی تاریخ کا حساب دیکھیں</p>
            </div>

            <div className="dashboard-content animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        className="btn-cancel"
                        style={{ width: 'auto' }}
                        onClick={() => router.push("/dashboard")} // OR any back link
                    >
                        &larr; واپس جائیں
                    </button>
                </div>

                <div className="filters-card">
                    <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="searchDate" className="form-label">تاریخ منتخب کریں</label>
                            <input
                                id="searchDate"
                                type="date"
                                className="form-input"
                                value={searchDate}
                                onChange={(e) => setSearchDate(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-save"
                            disabled={isLoading || !searchDate}
                        >
                            {isLoading ? "تلاش کر رہا ہے..." : "ریکارڈ دیکھیں"}
                        </button>
                    </form>
                </div>

                {hasSearched && !isLoading && (
                    <div className="animate-slide-up">
                        {entry ? (
                            <div className="summary-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary)' }}>
                                        {new Date(entry.date).toLocaleDateString('ur-PK')}
                                    </h2>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                        {new Date(entry.date).toLocaleDateString('ur-PK', { weekday: 'long' })}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button type="button" className="drilldown-row" onClick={openEntryEdit}>
                                        <span style={{ color: 'var(--text-muted)' }}>سیل:</span>
                                        <span className="numeric-input" style={{ fontWeight: 'bold' }}>{formatOMR(entry.sale_total)} OMR</span>
                                    </button>
                                    <button type="button" className="drilldown-row" onClick={openPurchaseForDate}>
                                        <span style={{ color: 'var(--text-muted)' }}>خریداری:</span>
                                        <span className="numeric-input" style={{ fontWeight: 'bold' }}>{formatOMR(entry.purchase_total)} OMR</span>
                                    </button>
                                    <button type="button" className="drilldown-row" onClick={openEntryEdit}>
                                        <span style={{ color: 'var(--text-muted)' }}>اخراجات:</span>
                                        <span className="numeric-input" style={{ fontWeight: 'bold' }}>{formatOMR(entry.expense_total)} OMR</span>
                                    </button>
                                    <button type="button" className="drilldown-row" onClick={openEntryEdit}>
                                        <span style={{ color: 'var(--text-muted)' }}>اضافی اخراجات:</span>
                                        <span className="numeric-input" style={{ fontWeight: 'bold', color: '#ea580c' }}>{formatOMR(entry.extra_expense_total)} OMR</span>
                                    </button>
                                    <button type="button" className="drilldown-row" onClick={openEntryEdit}>
                                        <span style={{ color: 'var(--text-muted)' }}>مد (وجہ):</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{entry.extra_expense_reason || "-"}</span>
                                    </button>
                                    <button type="button" className="drilldown-row drilldown-row-total" onClick={openEntryEdit}>
                                        <span style={{ fontWeight: 'bold' }}>منافع:</span>
                                        <span className={`numeric-input ${entry.profit_total >= 0 ? 'profit-positive' : 'profit-negative'}`} style={{ fontWeight: 'bold' }}>
                                            {formatOMR(entry.profit_total)} OMR
                                        </span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}
                                        onClick={() => router.push(`/records/${entry.id}/edit`)}
                                    >
                                        ترمیم کریں (Edit)
                                    </button>
                                    <button
                                        style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}
                                        onClick={() => handleDelete(entry.id)}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? "ڈیلیٹ ہو رہا ہے..." : "ڈیلیٹ کریں (Delete)"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                اس تاریخ کا کوئی ریکارڈ موجود نہیں
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

import Link from "next/link";
import { getItemUsageSummary, getPurchaseHistory } from "../purchaseActions";
import { getCurrentUser } from "../../lib/auth";
import {
    CalendarDays,
    History,
    Layers3,
    PackageCheck,
    PencilLine,
    PlusCircle,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Store,
    WalletCards
} from "lucide-react";
import { formatOMR } from "../../lib/formatMoney";

export const dynamic = 'force-dynamic';

function formatAmount(value) {
    return formatOMR(value);
}

function formatQuantity(value) {
    const numberValue = Number(value || 0);
    return Number.isInteger(numberValue) ? numberValue.toString() : numberValue.toFixed(2);
}

function sanitizeDays(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 7;
    return Math.min(365, Math.max(1, parsed));
}

function entryTotal(entry) {
    return entry.lines ? entry.lines.reduce((sum, line) => sum + Number(line.total_price || 0), 0) : 0;
}

function periodSubtitle(ranges, key) {
    return ranges ? `${ranges[key].start} تا ${ranges[key].end}` : "کوئی ریکارڈ نہیں";
}

export default async function PurchasesDashboardPage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const customDays = sanitizeDays(resolvedSearchParams?.days || 7);
    const [history, usageSummary, currentUser] = await Promise.all([
        getPurchaseHistory(),
        getItemUsageSummary(customDays),
        getCurrentUser()
    ]);
    const isAdmin = currentUser?.role === "ADMIN";

    const usageCards = [
        {
            key: "day",
            title: "تازہ دن",
            subtitle: usageSummary.reportDate || "کوئی ریکارڈ نہیں",
            icon: CalendarDays,
            tone: "usage-green"
        },
        {
            key: "custom",
            title: `${usageSummary.customDays || customDays} دن`,
            subtitle: periodSubtitle(usageSummary.ranges, "custom"),
            icon: SlidersHorizontal,
            tone: "usage-teal"
        },
        {
            key: "week",
            title: "7 دن",
            subtitle: periodSubtitle(usageSummary.ranges, "week"),
            icon: PackageCheck,
            tone: "usage-blue"
        },
        {
            key: "twoWeeks",
            title: "14 دن",
            subtitle: periodSubtitle(usageSummary.ranges, "twoWeeks"),
            icon: Layers3,
            tone: "usage-violet"
        },
        {
            key: "month",
            title: "رواں مہینہ",
            subtitle: periodSubtitle(usageSummary.ranges, "month"),
            icon: WalletCards,
            tone: "usage-amber"
        }
    ];

    return (
        <div className="container">
            <div className="dashboard-header animate-slide-up">
                <h1 className="dashboard-title">روزمرہ خریداری سسٹم</h1>
                <p className="dashboard-subtitle">اسٹور وائز قیمتوں اور خریداری کا تفصیلی ریکارڈ</p>
            </div>

            <div className="grid-cards animate-slide-up" style={{ animationDelay: '0.1s', marginBottom: '32px' }}>
                <Link href="/purchases/new" className="stat-card" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <PlusCircle size={40} color="var(--primary)" style={{ marginBottom: '10px' }} />
                    <div className="stat-label">آج کی خریداری کے اندراج</div>
                </Link>

                {isAdmin && (
                    <>
                        <Link href="/items" className="stat-card" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingBag size={40} color="#3b82f6" style={{ marginBottom: '10px' }} />
                            <div className="stat-label">آئٹمز (سامان)</div>
                        </Link>

                        <Link href="/stores" className="stat-card" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Store size={40} color="#f59e0b" style={{ marginBottom: '10px' }} />
                            <div className="stat-label">اسٹورز و سپلائرز</div>
                        </Link>

                        <Link href="/price-compare" className="stat-card" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Search size={40} color="#8b5cf6" style={{ marginBottom: '10px' }} />
                            <div className="stat-label">قیمتوں کا موازنہ</div>
                        </Link>
                    </>
                )}
            </div>

            <section className="purchase-usage-section animate-slide-up" style={{ animationDelay: '0.16s' }}>
                <div className="section-heading purchase-section-heading">
                    <div>
                        <span className="eyebrow">Item Wise Usage</span>
                        <h2>سامان کے حساب سے روزانہ، ہفتہ وار اور ماہانہ خرچ</h2>
                        <p>ہر آئٹم کی مقدار اور رقم خودکار طور پر خریداری کے ریکارڈ سے جمع ہوتی رہے گی۔</p>
                    </div>
                    <div className="purchase-heading-actions">
                        <form className="usage-days-form" method="get">
                            <label htmlFor="days">اپنی مدت</label>
                            <input id="days" name="days" type="number" min="1" max="365" defaultValue={usageSummary.customDays || customDays} />
                            <span>دن</span>
                            <button type="submit">دیکھیں</button>
                        </form>
                        <Link href="/purchases/new" className="btn-submit purchase-inline-action">
                            نئی خریداری شامل کریں
                        </Link>
                    </div>
                </div>

                <div className="usage-card-grid">
                    {usageCards.map((card) => {
                        const Icon = card.icon;
                        const total = usageSummary.totals[card.key];
                        return (
                            <div key={card.key} className={`usage-total-card ${card.tone}`}>
                                <span className="usage-total-icon">
                                    <Icon size={20} />
                                </span>
                                <div>
                                    <span>{card.title}</span>
                                    <strong>{formatAmount(total.amount)} OMR</strong>
                                    <small>{card.subtitle}</small>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="card purchase-usage-card">
                    <div className="table-container">
                        <table className="data-table usage-table">
                            <thead>
                                <tr>
                                    <th>سامان</th>
                                    <th>تازہ دن</th>
                                    <th>{usageSummary.customDays || customDays} دن</th>
                                    <th>7 دن</th>
                                    <th>14 دن</th>
                                    <th>مہینہ</th>
                                    <th>آخری خرید</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usageSummary.items.length > 0 ? (
                                    usageSummary.items.map((item) => (
                                        <tr key={item.itemId}>
                                            <td>
                                                <div className="usage-item-name">
                                                    <strong>{item.name}</strong>
                                                    <span>{item.category || "دیگر"} · {item.unit}</span>
                                                </div>
                                            </td>
                                            {["day", "custom", "week", "twoWeeks", "month"].map((period) => (
                                                <td key={period}>
                                                    <div className="usage-period-cell">
                                                        <strong>{formatAmount(item[period].amount)} OMR</strong>
                                                        <span>{formatQuantity(item[period].quantity)} {item.unit}</span>
                                                        <small>{item[period].count || 0} دفعہ</small>
                                                    </div>
                                                </td>
                                            ))}
                                            <td style={{ direction: 'ltr', textAlign: 'right' }}>{item.lastDate}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                            ابھی تک item-wise خریداری کا ریکارڈ موجود نہیں۔
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="purchase-days-section animate-slide-up" style={{ animationDelay: '0.18s' }}>
                <div className="section-heading purchase-section-heading">
                    <div>
                        <span className="eyebrow">Date Wise Purchases</span>
                        <h2>تاریخ کے حساب سے خریداری</h2>
                        <p>ہر دن کی خریداری الگ box میں نظر آئے گی، اور غلطی ہو تو اسی دن کو edit کیا جا سکے گا۔</p>
                    </div>
                </div>

                {history.length > 0 ? (
                    <div className="purchase-day-grid">
                        {history.map((entry) => {
                            const total = entryTotal(entry);
                            return (
                                <article key={entry.id} className="purchase-day-card">
                                    <div className="purchase-day-card-head">
                                        <div>
                                            <span style={{ direction: 'ltr' }}>{entry.date}</span>
                                            <strong>{formatAmount(total)} OMR</strong>
                                        </div>
                                        <Link href={`/purchases/${entry.id}/edit`} className="purchase-edit-link">
                                            <PencilLine size={16} />
                                            Edit
                                        </Link>
                                    </div>

                                    <div className="purchase-day-meta">
                                        <span>{entry.lines?.length || 0} آئٹمز</span>
                                        {entry.notes && <span>{entry.notes}</span>}
                                    </div>

                                    <div className="purchase-day-lines">
                                        {entry.lines.slice(0, 8).map((line) => (
                                            <div key={line.id}>
                                                <span>{line.item?.name || "آئٹم"}</span>
                                                <b>{formatQuantity(line.quantity)} {line.unit}</b>
                                                <strong>{formatAmount(line.total_price)} OMR</strong>
                                            </div>
                                        ))}
                                        {entry.lines.length > 8 && <small>+{entry.lines.length - 8} مزید آئٹمز</small>}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">ابھی کوئی خریداری محفوظ نہیں۔</div>
                )}
            </section>

            <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <History size={24} color="var(--primary)" />
                        حالیہ خریداری کی فہرست
                    </h2>
                </div>

                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>تاریخ</th>
                                <th>آئٹمز کی تعداد</th>
                                <th>کل رقم (OMR)</th>
                                <th>تفصیلات</th>
                                <th>درستگی</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? (
                                history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td style={{ direction: 'ltr', textAlign: 'right' }}>{entry.date}</td>
                                        <td>{entry.lines ? entry.lines.length : 0} آئٹمز</td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>
                                            {formatAmount(entryTotal(entry))}
                                        </td>
                                        <td>
                                            <div className="purchase-history-lines">
                                                {entry.lines.slice(0, 3).map((line) => (
                                                    <span key={line.id}>
                                                        <Search size={13} />
                                                        {line.item?.name || "آئٹم"}: {formatQuantity(line.quantity)} {line.unit} · {formatAmount(line.total_price)} OMR
                                                    </span>
                                                ))}
                                                {entry.lines.length > 3 && <small>+{entry.lines.length - 3} مزید آئٹمز</small>}
                                            </div>
                                        </td>
                                        <td>
                                            <Link href={`/purchases/${entry.id}/edit`} className="purchase-edit-link">
                                                <PencilLine size={16} />
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                        کوئی خریداری کا ریکارڈ نہیں ملا۔
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

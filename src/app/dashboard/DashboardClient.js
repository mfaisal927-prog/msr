"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    CalendarDays,
    CalendarRange,
    ClipboardList,
    PackageCheck,
    PlusCircle,
    ReceiptText,
    Search,
    ShoppingBag,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { formatOMR } from "../../lib/formatMoney";

const monthLabels = {
    ur: {
        1: "جنوری",
        2: "فروری",
        3: "مارچ",
        4: "اپریل",
        5: "مئی",
        6: "جون",
        7: "جولائی",
        8: "اگست",
        9: "ستمبر",
        10: "اکتوبر",
        11: "نومبر",
        12: "دسمبر",
    },
    en: {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December",
    },
};

const copy = {
    ur: {
        noRecord: "ابھی کوئی ریکارڈ موجود نہیں",
        title: "آپریشن ڈیش بورڈ",
        latestRecord: "تازہ ترین ریکارڈ",
        monthSummary: (count) => `${count} ماہ کا خلاصہ`,
        summaryCards: {
            sales: ["آخری سیل", "محفوظ شدہ تازہ ترین دن"],
            purchases: ["آخری خریداری", "سپلائر اور اسٹاک خرچ"],
            expenses: ["کل اخراجات", "روزانہ + اضافی اخراجات"],
            profitPositive: "مثبت کارکردگی",
            profitNegative: "توجہ کی ضرورت",
            profitTitle: "بچت / منافع",
        },
        trend: "Trend View",
        monthsHeading: "پچھلے مہینوں کا خلاصہ",
        empty: "کوئی ریکارڈ موجود نہیں ہے۔",
        sales: "سیل",
        purchases: "خریداری",
        expenses: "اخراجات",
        profit: "منافع",
        workflow: "Daily Workflow",
        quickHeading: "فوری روابط",
        actions: {
            entry: "نئی انٹری کریں",
            records: "تمام ریکارڈ دیکھیں",
            daily: "مخصوص تاریخ کا ریکارڈ",
            monthly: "ماہانہ حساب",
            reports: "رپورٹس",
            purchases: "خریداری مینجمنٹ",
        },
    },
    en: {
        noRecord: "No records yet",
        title: "Operations Dashboard",
        latestRecord: "Latest record",
        monthSummary: (count) => `${count} month summary`,
        summaryCards: {
            sales: ["Latest Sale", "Most recent saved day"],
            purchases: ["Latest Purchase", "Supplier and stock cost"],
            expenses: ["Total Expenses", "Daily + extra expenses"],
            profitPositive: "Positive performance",
            profitNegative: "Needs attention",
            profitTitle: "Savings / Profit",
        },
        trend: "Trend View",
        monthsHeading: "Recent Monthly Summary",
        empty: "No records are available yet.",
        sales: "Sales",
        purchases: "Purchases",
        expenses: "Expenses",
        profit: "Profit",
        workflow: "Daily Workflow",
        quickHeading: "Quick Actions",
        actions: {
            entry: "New Entry",
            records: "All Records",
            daily: "Specific Date",
            monthly: "Monthly Accounts",
            reports: "Reports",
            purchases: "Purchases",
        },
    },
};

function formatAmount(value) {
    return formatOMR(value);
}

function formatDateLabel(dateValue, language) {
    if (!dateValue) return copy[language].noRecord;
    const normalizedDate = typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? new Date(`${dateValue}T12:00:00`)
        : new Date(dateValue);
    const date = normalizedDate;
    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString(language === "ur" ? "ur-PK" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function DashboardClient({ sixMonthsData = [], latestEntry }) {
    const router = useRouter();
    const [language, setLanguage] = useState("ur");

    useEffect(() => {
        const syncLanguage = () => {
            const nextLanguage = document.documentElement.getAttribute("lang") === "en" ? "en" : "ur";
            setLanguage(nextLanguage);
        };

        syncLanguage();
        const observer = new MutationObserver(syncLanguage);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

        return () => observer.disconnect();
    }, []);

    const t = copy[language];

    const navigateTo = (path) => {
        router.push(path);
    };

    const latestTotals = useMemo(() => {
        const sales = latestEntry?.sale_total || 0;
        const purchases = latestEntry?.purchase_total || 0;
        const dailyExpenses = latestEntry?.expense_total || 0;
        const extraExpenses = latestEntry?.extra_expense_total || 0;
        const totalExpenses = dailyExpenses + extraExpenses;
        const profit = latestEntry?.profit_total ?? sales - purchases - totalExpenses;

        return { sales, purchases, totalExpenses, profit };
    }, [latestEntry]);

    const summaryCards = [
        {
            title: t.summaryCards.sales[0],
            value: latestTotals.sales,
            icon: ShoppingBag,
            tone: "blue",
            note: t.summaryCards.sales[1],
            path: latestEntry?.id ? `/records/${latestEntry.id}/edit` : "/daily-entry",
        },
        {
            title: t.summaryCards.purchases[0],
            value: latestTotals.purchases,
            icon: PackageCheck,
            tone: "amber",
            note: t.summaryCards.purchases[1],
            path: latestEntry?.purchaseEntryId
                ? `/purchases/${latestEntry.purchaseEntryId}/edit`
                : latestEntry?.date
                    ? `/purchases/new?date=${latestEntry.date}`
                    : "/purchases",
        },
        {
            title: t.summaryCards.expenses[0],
            value: latestTotals.totalExpenses,
            icon: ReceiptText,
            tone: "rose",
            note: t.summaryCards.expenses[1],
            path: latestEntry?.id ? `/records/${latestEntry.id}/edit` : "/records",
        },
        {
            title: t.summaryCards.profitTitle,
            value: latestTotals.profit,
            icon: latestTotals.profit >= 0 ? TrendingUp : TrendingDown,
            tone: latestTotals.profit >= 0 ? "green" : "rose",
            note: latestTotals.profit >= 0 ? t.summaryCards.profitPositive : t.summaryCards.profitNegative,
            valueClass: latestTotals.profit >= 0 ? "profit-positive" : "profit-negative",
            path: latestEntry?.id ? `/records/${latestEntry.id}/edit` : "/records",
        },
    ];

    const quickActions = [
        { label: t.actions.entry, path: "/daily-entry", icon: PlusCircle, tone: "green" },
        { label: t.actions.records, path: "/records", icon: ClipboardList, tone: "indigo" },
        { label: t.actions.daily, path: "/daily", icon: Search, tone: "violet" },
        { label: t.actions.monthly, path: "/monthly", icon: CalendarRange, tone: "blue" },
        { label: t.actions.reports, path: "/reports", icon: BarChart3, tone: "teal" },
        { label: t.actions.purchases, path: "/purchases", icon: Wallet, tone: "amber" },
    ];

    return (
        <div className="container dashboard-shell">
            <section className="dashboard-hero animate-slide-up">
                <div>
                    <span className="eyebrow">Malik Sajawal Refreshment</span>
                    <h1 className="dashboard-title">{t.title}</h1>
                    <p className="dashboard-subtitle">
                        {t.latestRecord}: {formatDateLabel(latestEntry?.date, language)}
                    </p>
                </div>

                <div className="dashboard-hero-meta">
                    <span>Live Accounting</span>
                    <strong>{t.monthSummary(sixMonthsData.length)}</strong>
                </div>
            </section>

            <section className="summary-grid animate-slide-up" style={{ animationDelay: "0.08s" }}>
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.title}
                            type="button"
                            className={`summary-card metric-card tone-${card.tone} click-through-card`}
                            onClick={() => navigateTo(card.path)}
                        >
                            <div className="metric-card-header">
                                <span className="metric-icon">
                                    <Icon size={20} />
                                </span>
                                <span className="card-title">{card.title}</span>
                            </div>
                            <div className={`card-value ${card.valueClass || ""}`}>
                                <span className="card-currency">OMR</span>
                                {formatAmount(card.value)}
                            </div>
                            <p className="metric-note">{card.note}</p>
                        </button>
                    );
                })}
            </section>

            <section className="dashboard-section animate-slide-up" style={{ animationDelay: "0.16s" }}>
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">{t.trend}</span>
                        <h2>{t.monthsHeading}</h2>
                    </div>
                </div>

                <div className="month-summary-grid">
                    {sixMonthsData.length === 0 ? (
                        <div className="empty-state">{t.empty}</div>
                    ) : (
                        sixMonthsData.map((data, index) => {
                            const isPositive = (data._sum.profit_total || 0) >= 0;
                            const monthStr = String(data.month).padStart(2, "0");

                            return (
                                <button
                                    key={`${data.year}-${data.month}`}
                                    className={`monthly-summary-card ${isPositive ? "positive" : "negative"}`}
                                    onClick={() => navigateTo(`/monthly/${data.year}/${monthStr}`)}
                                    style={{ animationDelay: `${(index + 1) * 0.05}s` }}
                                >
                                    <div className="monthly-card-top">
                                        <span className="metric-icon">
                                            <CalendarDays size={18} />
                                        </span>
                                        <strong>{monthLabels[language][data.month]} {data.year}</strong>
                                    </div>

                                    <div className="monthly-lines">
                                        <span>{t.sales} <b>{formatAmount(data._sum.sale_total)} OMR</b></span>
                                        <span>{t.purchases} <b>{formatAmount(data._sum.purchase_total)} OMR</b></span>
                                        <span>
                                            {t.expenses} <b>{formatAmount((data._sum.expense_total || 0) + (data._sum.extra_expense_total || 0))} OMR</b>
                                        </span>
                                    </div>

                                    <div className="monthly-profit">
                                        <span>{t.profit}</span>
                                        <b>
                                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            {formatAmount(data._sum.profit_total)} OMR
                                        </b>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="dashboard-section animate-slide-up" style={{ animationDelay: "0.24s" }}>
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">{t.workflow}</span>
                        <h2>{t.quickHeading}</h2>
                    </div>
                </div>

                <div className="actions-section">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.path}
                                className={`btn-action action-tile tone-${action.tone}`}
                                onClick={() => navigateTo(action.path)}
                            >
                                <span className="icon-circle">
                                    <Icon size={22} />
                                </span>
                                <span>{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

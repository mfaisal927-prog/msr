import { getEntriesByMonth } from "../../../../actions";
import RecordsClient from "../../../../records/RecordsClient";

export const metadata = {
    title: "اس ماہ کے ریکارڈز - Malik Sajawal Refreshment",
};

export const dynamic = "force-dynamic";

export default async function MonthlyRecordsPage({ params }) {
    const resolvedParams = await params;

    // Fetch entries strictly for this month and year from database
    const entries = await getEntriesByMonth(resolvedParams.year, resolvedParams.month);

    const monthLabels = {
        "01": "جنوری",
        "02": "فروری",
        "03": "مارچ",
        "04": "اپریل",
        "05": "مئی",
        "06": "جون",
        "07": "جولائی",
        "08": "اگست",
        "09": "ستمبر",
        "10": "اکتوبر",
        "11": "نومبر",
        "12": "دسمبر",
    };

    const currentMonthLabel = `${monthLabels[resolvedParams.month]} ${resolvedParams.year}`;

    return (
        <div className="container">
            <div className="dashboard-header">
                <h1 className="dashboard-title">اس ماہ کے ریکارڈز</h1>
                <p className="dashboard-subtitle">{currentMonthLabel}</p>
            </div>

            <div className="dashboard-content">
                <RecordsClient
                    initialEntries={entries}
                    backPath={`/monthly/${resolvedParams.year}/${resolvedParams.month}`}
                    canDelete
                    canExport
                />
            </div>
        </div>
    );
}

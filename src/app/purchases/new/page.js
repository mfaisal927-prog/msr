import PurchaseForm from "../PurchaseForm";

export default async function NewPurchasePage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams?.date || "")
        ? resolvedSearchParams.date
        : null;

    return <PurchaseForm mode="create" initialDate={initialDate} />;
}

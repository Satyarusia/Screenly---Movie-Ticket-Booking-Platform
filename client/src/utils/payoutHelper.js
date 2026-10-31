// client/src/utils/payoutHelper.js

const PAYOUT_STORAGE_KEY = "screenly_user_payout_accounts";

export const getSavedPayoutAccounts = () => {
  try {
    const raw = localStorage.getItem(PAYOUT_STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            id: "pay_default",
            type: "upi",
            title: "Default UPI",
            identifier: "user@okhdfcbank",
            bankName: "HDFC Bank",
            isDefault: true,
            createdAt: "Initial Setup",
          },
        ];
  } catch {
    return [];
  }
};

export const savePayoutAccount = (account) => {
  const existing = getSavedPayoutAccounts();
  const newAccount = {
    ...account,
    id: "payout_" + Date.now(),
    createdAt: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
  const updated = [newAccount, ...existing];
  localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const deletePayoutAccount = (id) => {
  const existing = getSavedPayoutAccounts();
  const updated = existing.filter((a) => a.id !== id);
  localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export default {
  getSavedPayoutAccounts,
  savePayoutAccount,
  deletePayoutAccount,
};

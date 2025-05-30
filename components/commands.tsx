import { Event } from "../src/slices/shared/genericTypes";
import {
  createIncomeEvent,
  createExpenseEvent,

} from "./events";


// -- Description dropdowns --

const incomeDescriptions = [
  "Code 101: Salary",
  "Code 102: Dividends",
  "Code 103: Freelance",
  "Code 104: Rental Income",
  "Code 105: Interest",
  "Code 106: Bonus",
  "Code 107: Royalties",
  "Code 108: Gift",
  "Code 109: Refund",
  "Code 110: Other Income",
];

const expenseDescriptions = [
  "Code 201: Rent",
  "Code 202: Utilities",
  "Code 203: Groceries",
  "Code 204: Transport",
  "Code 205: Insurance",
  "Code 206: Entertainment",
  "Code 207: Healthcare",
  "Code 208: Education",
  "Code 209: Clothing",
  "Code 210: Miscellaneous",
];

// -- Modal-style dropdown helper --

function showDescriptionDialog(options: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "8px";
    select.style.margin = "10px 0";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select a description --";
    select.appendChild(defaultOption);

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.right = "0";
    modal.style.bottom = "0";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "white";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "8px";
    modalContent.style.width = "300px";

    const title = document.createElement("h3");
    title.textContent = "Select Description";
    modalContent.appendChild(title);
    modalContent.appendChild(select);

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "Confirm";
    confirmButton.style.marginTop = "10px";
    confirmButton.onclick = () => {
      const selectedValue = select.value;
      document.body.removeChild(modal); // Close the modal immediately after confirmation
      resolve(selectedValue || null);
    };

    modalContent.appendChild(confirmButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  });
}

// -- Command Functions --



export async function addIncomeCommand(changeId: string): Promise<Event | null> {
  if (!changeId) return null;

  const description = await showDescriptionDialog(incomeDescriptions);
  if (!description) {
    alert("No description selected");
    return null;
  }

  const amount = Number(prompt("Amount CHF:"));
  if (isNaN(amount)) {
    alert("Invalid amount");
    return null;
  }

  const startMonth = prompt("Start month (YYYY-MM):", "2025-01") || "2025-01";
  const endMonth = prompt("End month (YYYY-MM):", "2025-03") || "2025-03";

  return createIncomeEvent(changeId, amount, description, startMonth, endMonth);
}

export async function addExpenseCommand(changeId: string): Promise<Event | null> {
  if (!changeId) return null;

  const description = await showDescriptionDialog(expenseDescriptions);
  if (!description) {
    alert("No description selected");
    return null;
  }

  const amount = Number(prompt("Amount CHF:"));
  if (isNaN(amount)) {
    alert("Invalid amount");
    return null;
  }

  const startMonth = prompt("Start month (YYYY-MM):", "2025-03") || "2025-03";
  const endMonth = prompt("End month (YYYY-MM):", "2025-04") || "2025-04";

  return createExpenseEvent(changeId, amount, description, startMonth, endMonth);
}


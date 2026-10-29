const STORAGE_KEY = "spendwise-expenses-v1";

const form = document.querySelector("#expenseForm");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const filterInput = document.querySelector("#filterCategory");
const expenseList = document.querySelector("#expenseList");
const emptyState = document.querySelector("#emptyState");
const formMessage = document.querySelector("#formMessage");
const clearAllButton = document.querySelector("#clearAll");
const confirmDialog = document.querySelector("#confirmDialog");

const categoryIcons = {
  Food: "🍜",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "💡",
  Health: "💊",
  Entertainment: "🎬",
  Other: "📦",
};

function getLocalDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function loadExpenses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.description === "string" &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        Object.hasOwn(categoryIcons, item.category) &&
        typeof item.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date),
    );
  } catch {
    return [];
  }
}

let expenses = loadExpenses();

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    formMessage.textContent =
      "Could not save data. Check your browser storage settings.";
    return false;
  }
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getMonthTotal() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;

  return expenses
    .filter((expense) => expense.date.startsWith(currentMonth))
    .reduce((total, expense) => total + expense.amount, 0);
}

function updateSummary() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  document.querySelector("#totalAmount").textContent = formatMoney(total);
  document.querySelector("#monthAmount").textContent =
    formatMoney(getMonthTotal());
  document.querySelector("#transactionCount").textContent = String(
    expenses.length,
  );
}

function createExpenseElement(expense) {
  const item = document.createElement("article");
  item.className = "expense-item";

  const icon = document.createElement("div");
  icon.className = "expense-icon";
  icon.textContent = categoryIcons[expense.category];
  icon.setAttribute("aria-hidden", "true");

  const info = document.createElement("div");
  info.className = "expense-info";

  const title = document.createElement("strong");
  title.textContent = expense.description;

  const details = document.createElement("span");
  details.textContent = `${expense.category} · ${formatDate(expense.date)}`;

  info.append(title, details);

  const right = document.createElement("div");
  right.className = "expense-right";

  const amount = document.createElement("strong");
  amount.textContent = formatMoney(expense.amount);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute(
    "aria-label",
    `Delete expense: ${expense.description}`,
  );
  deleteButton.addEventListener("click", () => deleteExpense(expense.id));

  right.append(amount, deleteButton);
  item.append(icon, info, right);

  return item;
}

function renderExpenses() {
  const selectedCategory = filterInput.value;

  const visibleExpenses = expenses
    .filter(
      (expense) =>
        selectedCategory === "All" || expense.category === selectedCategory,
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  expenseList.replaceChildren(...visibleExpenses.map(createExpenseElement));

  emptyState.hidden = visibleExpenses.length !== 0;
  emptyState.textContent =
    expenses.length === 0
      ? "Nothing here yet. Add your first expense to get started."
      : "No expenses match this category.";

  document.querySelector("#visibleCount").textContent =
    `${visibleExpenses.length} transaction${visibleExpenses.length === 1 ? "" : "s"}`;

  clearAllButton.disabled = expenses.length === 0;
  updateSummary();
}

function deleteExpense(id) {
  const previousExpenses = expenses;
  expenses = expenses.filter((expense) => expense.id !== id);

  if (!saveExpenses()) {
    expenses = previousExpenses;
    return;
  }

  formMessage.textContent = "Expense deleted.";
  renderExpenses();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description) {
    formMessage.textContent = "Please enter a description.";
    descriptionInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    formMessage.textContent = "Enter an amount greater than ₹0.";
    amountInput.focus();
    return;
  }

  if (!Object.hasOwn(categoryIcons, category)) {
    formMessage.textContent = "Please choose a valid category.";
    return;
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    formMessage.textContent = "Please choose a valid date.";
    return;
  }

  const expense = {
    id: crypto.randomUUID(),
    description,
    amount: Math.round(amount * 100) / 100,
    category,
    date,
  };

  expenses.push(expense);

  if (!saveExpenses()) {
    expenses.pop();
    return;
  }

  form.reset();
  dateInput.value = getLocalDate();
  formMessage.textContent = "Expense added successfully!";
  renderExpenses();
});

filterInput.addEventListener("change", renderExpenses);

clearAllButton.addEventListener("click", () => {
  if (expenses.length > 0) confirmDialog.showModal();
});

confirmDialog.addEventListener("close", () => {
  if (confirmDialog.returnValue !== "confirm") return;

  const previousExpenses = expenses;
  expenses = [];

  if (!saveExpenses()) {
    expenses = previousExpenses;
    return;
  }

  formMessage.textContent = "All expenses cleared.";
  renderExpenses();
});

dateInput.value = getLocalDate();
document.querySelector("#year").textContent = new Date().getFullYear();

renderExpenses();

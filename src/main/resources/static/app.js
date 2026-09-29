

const API_URL = "/api/pooja";
const PARTICULARS_API_URL = "/api/particulars";

let editingRow = null;
let poojaParticulars = [];


const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");

const particulars = document.getElementById("particulars");

const standardAmountRow =
    document.getElementById("standardAmountRow");

const standardAmount =
    document.getElementById("standardAmount");

const otherParticularRow =
    document.getElementById("otherParticularRow");

const otherParticular =
    document.getElementById("otherParticular");

const otherAmountRow =
    document.getElementById("otherAmountRow");

const otherAmount =
    document.getElementById("otherAmount");

const devoteeName =
    document.getElementById("devoteeName");

const address =
    document.getElementById("address");

const phone =
    document.getElementById("phone");

const recordsTable =
    document.getElementById("recordsTable");

const searchBox =
    document.getElementById("searchBox");
    
const ratesTable =
    document.getElementById("ratesTable");

const loadRatesButton =
    document.getElementById("loadRatesButton");
    
const manageRatesCheckbox =
    document.getElementById("manageRatesCheckbox");

const ratesManagementContent =
    document.getElementById("ratesManagementContent");
    
    const EXPENSES_API_URL = "/api/expenses";

const expenseDescription =
    document.getElementById("expenseDescription");

const expenseAmount =
    document.getElementById("expenseAmount");

const saveExpenseButton =
    document.getElementById("saveExpenseButton");

const clearExpenseButton =
    document.getElementById("clearExpenseButton");

const expensesTable =
    document.getElementById("expensesTable");

const showExpensesButton =
    document.getElementById("showExpensesButton");

    
const todayIncome =
    document.getElementById("todayIncome");

const todayExpense =
    document.getElementById("todayExpense");
    

/*
 * Load standard pooja particulars and amounts
 * from PostgreSQL.
 */
async function loadParticulars() {

    try {

        const response =
            await fetch(PARTICULARS_API_URL);

        if (!response.ok) {

            throw new Error(
                "Failed to load particulars"
            );
        }

        poojaParticulars =
            await response.json();


        /*
         * Clear existing options.
         */
        particulars.innerHTML = "";


        /*
         * Default option.
         */
        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "Select Pooja";

        particulars.appendChild(defaultOption);


        /*
         * Add particulars from database.
         */
        poojaParticulars.forEach(item => {

            const option =
                document.createElement("option");

            option.value =
                item.particulars;

            option.textContent =
                item.particulars;

            particulars.appendChild(option);
        });


        /*
         * Add Others.
         *
         * Others is not a fixed-price item,
         * so it is deliberately not stored
         * in pooja_particulars.
         */
        const othersOption =
            document.createElement("option");

        othersOption.value = "Others";
        othersOption.textContent = "Others";

        particulars.appendChild(othersOption);


    } catch (error) {

        console.error(error);

        alert(
            "Could not load pooja particulars from the database."
        );
    }
}


async function loadExpenses() {

    try {

        const response =
            await fetch(EXPENSES_API_URL);

        if (!response.ok) {
            throw new Error("Failed to load expenses");
        }

        const expenses =
            await response.json();

        expensesTable.innerHTML = "";

        expenses.forEach(expense => {
            addExpenseToTable(expense);
        });

    } catch (error) {

        console.error(error);

        alert("Could not load expenses.");
    }
}


function addExpenseToTable(expense) {

    const row =
        expensesTable.insertRow();

    row.insertCell(0).textContent =
        formatDate(expense.expense_date);

    row.insertCell(1).textContent =
        expense.name_or_description;

    row.insertCell(2).textContent =
        "₹" +
        Number(expense.amount).toFixed(2);
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const parts =
        dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0].slice(-2)
    );
}


function clearExpenseForm() {

    expenseDescription.value = "";
    expenseAmount.value = "";
}

/*
 * Handle Particulars selection.
 */
particulars.addEventListener(
    "change",
    function () {

        const selected =
            particulars.value;


        if (selected === "Others") {

            /*
             * Show Others fields.
             */
            otherParticularRow.style.display = "";
            otherAmountRow.style.display = "";

            standardAmountRow.style.display = "none";

            standardAmount.textContent = "₹0.00";

            otherParticular.focus();

            return;
        }


        /*
         * Normal pooja.
         */
        otherParticularRow.style.display = "none";
        otherAmountRow.style.display = "none";

        otherParticular.value = "";
        otherAmount.value = "";


        if (selected === "") {

            standardAmount.textContent = "₹0.00";

            return;
        }


        const selectedParticular =
            poojaParticulars.find(
                item =>
                    item.particulars === selected
            );


        if (selectedParticular) {

            standardAmount.textContent =
                "₹" +
                Number(selectedParticular.amount)
                    .toFixed(2);

        } else {

            standardAmount.textContent =
                "₹0.00";
        }
    }
);

saveExpenseButton.addEventListener(
    "click",
    async function () {

        const description =
            expenseDescription.value.trim();

        const amount =
            expenseAmount.value.trim();


        if (description === "") {

            alert(
                "Please enter the expense name or description."
            );

            expenseDescription.focus();

            return;
        }


        const numericAmount =
            Number(amount);


        if (
            amount === "" ||
            !Number.isFinite(numericAmount) ||
            numericAmount < 0
        ) {

            alert(
                "Please enter a valid expense amount."
            );

            expenseAmount.focus();

            return;
        }


        try {

            const response =
                await fetch(
                    EXPENSES_API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                name_or_description:
                                    description,

                                amount:
                                    numericAmount.toFixed(2)
                            })
                    }
                );


            if (!response.ok) {

                const error =
                    await response.json()
                        .catch(() => null);

                throw new Error(
                    error?.message ||
                    "Server returned HTTP " +
                    response.status
                );
            }


            await response.json();


            /*
             * Update today's expense amount
             * immediately.
             *
             * Do NOT load the expense list here.
             */
            await loadTodaySummary();


            clearExpenseForm();


            showNotification(
                "Expense saved successfully"
            );


        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Could not save the expense."
            );
        }

    }
);


clearExpenseButton.addEventListener(
    "click",
    function () {

        clearExpenseForm();

    }
);

function showNotification(message) {

    let notification =
        document.getElementById("notification");

    if (!notification) {

        notification =
            document.createElement("div");

        notification.id =
            "notification";

        document.body.appendChild(
            notification
        );
    }

    notification.textContent =
        message;

    notification.style.position = "fixed";
    notification.style.top = "50%";
    notification.style.left = "50%";
    notification.style.transform = "translate(-50%, -50%)";
    notification.style.zIndex = "9999";
    notification.style.padding = "20px 35px";
    notification.style.background = "#ffffff";
    notification.style.border = "2px solid green";
    notification.style.borderRadius = "10px";
    notification.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    notification.style.fontSize = "18px";
    notification.style.fontWeight = "bold";
    notification.style.color = "green";
    notification.style.textAlign = "center";
    notification.style.display = "block";

    setTimeout(
        function () {

            notification.style.display = "none";

        },
        3000
    );
}


/*
 * Load expenses from Ktor/PostgreSQL.
 */
async function loadExpenses() {

    try {

        const response =
            await fetch(EXPENSES_API_URL);

        if (!response.ok) {

            throw new Error(
                "Failed to load expenses"
            );
        }

        const expenses =
            await response.json();

        expensesTable.innerHTML = "";

        expenses.forEach(expense => {

            addExpenseToTable(expense);

        });

    } catch (error) {

        console.error(error);

        alert(
            "Could not load expenses."
        );
    }
}

/*
 * SHOW / HIDE expense list.
 */
showExpensesButton.addEventListener(
    "click",
    async function () {

        const expenseSection =
            document.querySelector(
                ".expense-table-section"
            );

        if (expenseSection.style.display === "none") {

            await loadExpenses();

            expenseSection.style.display = "block";

            showExpensesButton.textContent =
                "HIDE EXPENSES";

        } else {

            expenseSection.style.display = "none";

            showExpensesButton.textContent =
                "SHOW EXPENSES";
        }
    }
);


/*
 * Add one expense to the expense table.
 */
function addExpenseToTable(expense) {

    const row =
        expensesTable.insertRow();

    row.dataset.id =
        expense.id;


    /*
     * Date
     *
     * Database format:
     * YYYY-MM-DD
     *
     * Display format:
     * DD/MM/YY
     */
    let displayDate =
        expense.expense_date;

    if (expense.expense_date) {

        const dateParts =
            expense.expense_date.split("-");

        if (dateParts.length === 3) {

            const year =
                dateParts[0].slice(-2);

            const month =
                dateParts[1];

            const day =
                dateParts[2];

            displayDate =
                `${day}/${month}/${year}`;
        }
    }


    row.insertCell(0).textContent =
        displayDate;


    row.insertCell(1).textContent =
        expense.name_or_description;


    row.insertCell(2).textContent =
        expense.amount
            ? "₹" +
              Number(expense.amount)
                  .toFixed(2)
            : "";


    const actionCell =
        row.insertCell(3);

    /*
     * Delete will be added later.
     */
}



/*
 * CLEAR expense form.
 */
clearExpenseButton.addEventListener(
    "click",
    function () {

        clearExpenseForm();

    }
);


function clearExpenseForm() {

    expenseDescription.value =
        "";

    expenseAmount.value =
        "";
}

/*
 * Load records from Ktor/PostgreSQL.
 */
async function loadRecords() {

    try {

        const response =
            await fetch(API_URL);

        if (!response.ok) {

            throw new Error(
                "Failed to load records"
            );
        }

        const records =
            await response.json();

        recordsTable.innerHTML = "";


        records.forEach(record => {

            addRecordToTable(record);

        });


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the Temple Management Server."
        );
    }
}


/*
 * Add one record to the HTML table.
 */
function addRecordToTable(record) {

    const row =
        recordsTable.insertRow();

    row.dataset.id =
        record.s_no;


    row.insertCell(0).textContent =
        record.s_no;


    /*
     * Particulars display.
     *
     * For Others, display:
     * Others - Special Pooja
     */
    let particularDisplay =
        record.particulars;

    if (
        record.particulars === "Others" &&
        record.other_particular
    ) {

        particularDisplay =
            "Others - " +
            record.other_particular;
    }

/*
 * Add transaction date to the
 * particulars display.
 *
 * Database format:
 * YYYY-MM-DD
 *
 * Display format:
 * DD/MM/YY
 */
if (record.transaction_date) {

    const dateParts =
        record.transaction_date.split("-");

    if (dateParts.length === 3) {

        const year =
            dateParts[0].slice(-2);

        const month =
            dateParts[1];

        const day =
            dateParts[2];

        particularDisplay +=
            ` (${day}/${month}/${year})`;
    }
}

    row.insertCell(1).textContent =
        particularDisplay;


    /*
     * Amount.
     */
    row.insertCell(2).textContent =
        record.amount
            ? "₹" + Number(record.amount).toFixed(2)
            : "";


    row.insertCell(3).textContent =
        record.devotee_name;


    row.insertCell(4).textContent =
        record.address || "";


    row.insertCell(5).textContent =
        record.phone_number || "";


    const actionCell =
        row.insertCell(6);


    /*
     * Edit button.
     */
    const editButton =
        document.createElement("button");

    editButton.textContent =
        "Edit";

    editButton.addEventListener(
        "click",
        function () {

            editRecord(row);

        }
    );


    /*
     * Delete button.
     */
    const deleteButton =
        document.createElement("button");

    deleteButton.textContent =
        "Delete";

    deleteButton.addEventListener(
        "click",
        function () {

            deleteRecord(row);

        }
    );


    actionCell.appendChild(editButton);

    actionCell.appendChild(deleteButton);
}


/*
 * Build request object from form.
 */
function getFormRecord() {

    const selectedParticular =
        particulars.value;


    let record;


    if (selectedParticular === "Others") {

        record = {

            particulars:
                "Others",

            other_particular:
                otherParticular.value.trim(),

            amount:
                otherAmount.value.trim(),

            devotee_name:
                devoteeName.value.trim(),

            address:
                address.value.trim() || null,

            phone_number:
                phone.value.trim() || null
        };


    } else {

        const selected =
            poojaParticulars.find(
                item =>
                    item.particulars ===
                    selectedParticular
            );


        record = {

            particulars:
                selectedParticular,

            other_particular:
                null,

            amount:
                selected
                    ? selected.amount
                    : null,

            devotee_name:
                devoteeName.value.trim(),

            address:
                address.value.trim() || null,

            phone_number:
                phone.value.trim() || null
        };
    }


    return record;
}


/*
 * Validate form.
 */
function validateForm() {

    if (particulars.value === "") {

        alert(
            "Please select the particulars."
        );

        return false;
    }


    if (particulars.value === "Others") {

        if (
            otherParticular.value.trim() === ""
        ) {

            alert(
                "Please specify the other particular."
            );

            otherParticular.focus();

            return false;
        }


        const amountValue =
            Number(otherAmount.value);


        if (
            otherAmount.value.trim() === "" ||
            !Number.isFinite(amountValue) ||
            amountValue < 0
        ) {

            alert(
                "Please enter a valid amount for Others."
            );

            otherAmount.focus();

            return false;
        }
    }


    if (devoteeName.value.trim() === "") {

        alert(
            "Please enter the devotee name."
        );

        devoteeName.focus();

        return false;
    }


    return true;
}


/*
 * SAVE / UPDATE button.
 */
saveButton.addEventListener(
    "click",
    async function () {

        if (!validateForm()) {
            return;
        }


        const record =
            getFormRecord();


        /*
         * UPDATE existing record.
         */
        if (editingRow !== null) {

            const id =
                editingRow.dataset.id;


            try {

                const response =
                    await fetch(
                        `${API_URL}/${id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(record)
                        }
                    );


                if (!response.ok) {

                    const error =
                        await response.json()
                            .catch(() => null);

                    throw new Error(
                        error?.message ||
                        "Server returned HTTP " +
                        response.status
                    );
                }


                await response.json();


                await loadRecords();


                editingRow = null;

                saveButton.textContent =
                    "SAVE";

                clearForm();


            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    "Could not update the record."
                );
            }


            return;
        }


        /*
         * CREATE new record.
         */
        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(record)
                    }
                );


            if (!response.ok) {

                const error =
                    await response.json()
                        .catch(() => null);

                throw new Error(
                    error?.message ||
                    "Server returned HTTP " +
                    response.status
                );
            }


            await response.json();


            await loadRecords();


            clearForm();


        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Could not save the record."
            );
        }

    }
);


/*
 * CLEAR button.
 */
clearButton.addEventListener(
    "click",
    function () {

        clearForm();

        editingRow = null;

        saveButton.textContent =
            "SAVE";
    }
);


/*
 * EDIT record.
 */
function editRecord(row) {

    const id =
        row.dataset.id;


    /*
     * Get the complete record from the
     * table/API rather than relying only
     * on displayed cells.
     */
    fetch(`${API_URL}/${id}`)
        .then(response => {

            /*
             * Our backend currently doesn't
             * have GET /api/pooja/{id}.
             *
             * So fall back to loading all records.
             */
            if (!response.ok) {
                throw new Error("Record lookup failed");
            }

            return response.json();
        })
        .then(record => {

            populateEditForm(record, row);

        })
        .catch(() => {

            /*
             * Since GET /api/pooja/{id} isn't
             * currently implemented, obtain
             * the record from the complete list.
             */
            loadRecordsForEdit(id, row);

        });
}


/*
 * Find a record by ID and populate the form.
 */
async function loadRecordsForEdit(id, row) {

    try {

        const response =
            await fetch(API_URL);

        if (!response.ok) {
            throw new Error(
                "Failed to load records"
            );
        }

        const records =
            await response.json();

        const record =
            records.find(
                item =>
                    String(item.s_no) ===
                    String(id)
            );


        if (!record) {

            alert(
                "Record could not be found."
            );

            return;
        }


        populateEditForm(record, row);


    } catch (error) {

        console.error(error);

        alert(
            "Could not load the record."
        );
    }
}


/*
 * Populate form for editing.
 */
function populateEditForm(record, row) {

    editingRow = row;


    particulars.value =
        record.particulars;


    /*
     * Trigger the appropriate UI.
     */
    particulars.dispatchEvent(
        new Event("change")
    );


    if (record.particulars === "Others") {

        otherParticular.value =
            record.other_particular || "";

        otherAmount.value =
            record.amount || "";
    }


    devoteeName.value =
        record.devotee_name || "";


    address.value =
        record.address || "";


    phone.value =
        record.phone_number || "";


    saveButton.textContent =
        "UPDATE";


    window.scrollTo({

        top: 0,

        behavior: "smooth"
    });
}


/*
 * DELETE record.
 */
async function deleteRecord(row) {

    const id =
        row.dataset.id;

    const name =
        row.cells[3].textContent;


    const confirmed =
        confirm(
            "Delete the record for " +
            name +
            "?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            const error =
                await response.json()
                    .catch(() => null);

            throw new Error(
                error?.message ||
                "Server returned HTTP " +
                response.status
            );
        }


        await response.text();


        await loadRecords();


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Could not delete the record."
        );
    }
}


/*
 * Clear form.
 */
function clearForm() {

    particulars.value = "";

    standardAmount.textContent =
        "₹0.00";

    standardAmountRow.style.display =
        "";

    otherParticularRow.style.display =
        "none";

    otherAmountRow.style.display =
        "none";

    otherParticular.value =
        "";

    otherAmount.value =
        "";

    devoteeName.value =
        "";

    address.value =
        "";

    phone.value =
        "";
}


/*
 * Search.
 */
searchBox.addEventListener(
    "input",
    function () {

        const searchText =
            searchBox.value
                .toLowerCase()
                .trim();


        const rows =
            recordsTable
                .getElementsByTagName("tr");


        for (let row of rows) {

            const rowText =
                row.textContent
                    .toLowerCase();


            if (
                rowText.includes(searchText)
            ) {

                row.style.display = "";

            } else {

                row.style.display =
                    "none";
            }
        }
    }
);



/*
 * Load today's income and expense summary.
 */
async function loadTodaySummary() {

    try {

        const response =
            await fetch("/api/today-summary");

        if (!response.ok) {

            throw new Error(
                "Failed to load today's summary"
            );
        }

        const summary =
            await response.json();


        todayIncome.textContent =
            "₹" +
            Number(summary.income)
                .toFixed(2);


        todayExpense.textContent =
            "₹" +
            Number(summary.expense)
                .toFixed(2);


    } catch (error) {

        console.error(error);

        todayIncome.textContent =
            "₹0.00";

        todayExpense.textContent =
            "₹0.00";
    }
}

/*
 * Load pooja rates from PostgreSQL.
 */
async function loadRates() {

    try {

        const response =
            await fetch(PARTICULARS_API_URL);

        if (!response.ok) {

            throw new Error(
                "Failed to load pooja rates"
            );
        }

        const rates =
            await response.json();

        ratesTable.innerHTML = "";


        rates.forEach(rate => {

            addRateToTable(rate);

        });


    } catch (error) {

        console.error(error);

        alert(
            "Could not load pooja rates."
        );
    }
}

/*
 * Add one rate to the rate-management table.
 */
function addRateToTable(rate) {

    const row =
        ratesTable.insertRow();

    row.dataset.id =
        rate.id;


    row.insertCell(0).textContent =
        rate.particulars;


    row.insertCell(1).textContent =
        "₹" +
        Number(rate.amount).toFixed(2);


    const amountCell =
        row.insertCell(2);


    const amountInput =
        document.createElement("input");

    amountInput.type = "number";
    amountInput.min = "0";
    amountInput.step = "0.01";
    amountInput.value =
        Number(rate.amount).toFixed(2);


    amountCell.appendChild(
        amountInput
    );


    const actionCell =
        row.insertCell(3);


    const updateButton =
        document.createElement("button");

    updateButton.textContent =
        "Update";

    updateButton.className =
        "update-rate-button";


    updateButton.addEventListener(
        "click",
        function () {

            updateRate(
                rate.id,
                rate.particulars,
                amountInput
            );

        }
    );


    actionCell.appendChild(
        updateButton
    );
}

/*
 * Update one pooja rate.
 */
async function updateRate(
    id,
    particular,
    amountInput
) {

    const newAmount =
        amountInput.value.trim();


    if (newAmount === "") {

        alert(
            "Please enter an amount."
        );

        amountInput.focus();

        return;
    }


    const numericAmount =
        Number(newAmount);


    if (
        !Number.isFinite(numericAmount) ||
        numericAmount < 0
    ) {

        alert(
            "Please enter a valid amount."
        );

        amountInput.focus();

        return;
    }


    const confirmed =
        confirm(
            "Change " +
            particular +
            " to ₹" +
            numericAmount.toFixed(2) +
            "?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${PARTICULARS_API_URL}/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            amount:
                                numericAmount
                                    .toFixed(2)
                        })
                }
            );


        if (!response.ok) {

            const error =
                await response.json()
                    .catch(() => null);

            throw new Error(
                error?.message ||
                "Server returned HTTP " +
                response.status
            );
        }


        /*
         * Reload both the rate table and
         * the particulars used by the
         * transaction form.
         */
        await loadRates();

        await loadParticulars();


        alert(
            particular +
            " rate updated successfully."
        );


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Could not update the pooja rate."
        );
    }
}


manageRatesCheckbox.addEventListener(
    "change",
    async function () {

        if (manageRatesCheckbox.checked) {

            ratesManagementContent.style.display = "";

            loadRatesButton.style.display = "";

            await loadRates();

        } else {

            ratesManagementContent.style.display = "none";

            loadRatesButton.style.display = "none";
        }
    }
);

/*
 * Refresh rates button.
 */
loadRatesButton.addEventListener(
    "click",
    loadRates
);

/*
 * Initial page loading.
 */
async function initialize() {

    await loadParticulars();

    await loadRecords();

    await loadTodaySummary();

    // await loadRates();
}

initialize();



// Replace with your actual live Render backend URL
const API_BASE_URL = "https://payroll-backend-3u74.onrender.com/";

const GOOGLE_API_KEY = "YOUR_GOOGLE_CALENDAR_API_KEY";
const HOLIDAY_CALENDAR_ID = "en.indian.official#holiday@group.v.calendar.google.com";

let currentDate = new Date();
let apiHolidays = {};
let customHolidays = JSON.parse(localStorage.getItem("customHolidays")) || {};

// Sync members from MongoDB Atlas on app load
async function syncMembersFromCloud() {
    try {
        const res = await fetch(`${API_BASE_URL}/members`);
        if (res.ok) {
            const members = await res.json();
            localStorage.setItem("members", JSON.stringify(members));
        }
    } catch (err) {
        console.warn("Using offline cached member data:", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await syncMembersFromCloud();

    if (document.getElementById("homeScreen")) {
        const loggedMember = JSON.parse(localStorage.getItem("loggedMember"));
        if (loggedMember) {
            startMemberDashboard(loggedMember);
        }
    }

    if (document.getElementById("adminLoginScreen")) {
        if (localStorage.getItem("isAdminLoggedIn") === "true") {
            showAdminDashboard();
        } else {
            renderMemberTable();
        }
    }
});

// --- MEMBER PORTAL ---
function handleSafetyCardLogin(event) {
    event.preventDefault();
    const cardInput = document.getElementById("safetyCardNumber").value.trim();
    const members = JSON.parse(localStorage.getItem("members")) || [];

    const foundMember = members.find(m => m.cardNo.toLowerCase() === cardInput.toLowerCase());

    if (foundMember) {
        localStorage.setItem("loggedMember", JSON.stringify(foundMember));
        startMemberDashboard(foundMember);
    } else {
        document.getElementById("memberLoginError").innerText = "Invalid Safety Card Number. Please check and try again.";
    }
}

function startMemberDashboard(member) {
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("dashboardScreen").classList.remove("hidden");
    document.getElementById("userWelcome").innerText = `Welcome, ${member.name} (${member.cardNo})`;

    document.getElementById("infoMemName").innerText = member.name;
    document.getElementById("infoMemPhone").innerText = member.phone;
    document.getElementById("infoMemGatepass").innerText = member.gatepass;
    document.getElementById("infoMemDailyWage").innerText = parseFloat(member.dailyWage || 0).toFixed(2);

    fetchGoogleHolidays(currentDate.getFullYear(), member);
}

function logout() {
    localStorage.removeItem("loggedMember");
    document.getElementById("dashboardScreen").classList.add("hidden");
    document.getElementById("homeScreen").classList.remove("hidden");
    document.getElementById("safetyCardNumber").value = "";
}

// --- ADMIN PORTAL ---
function handleAdminLogin(event) {
    event.preventDefault();
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    if (user === "admin" && pass === "admin123") {
        localStorage.setItem("isAdminLoggedIn", "true");
        showAdminDashboard();
    } else {
        document.getElementById("adminLoginError").innerText = "Invalid Admin ID or Password!";
    }
}

async function showAdminDashboard() {
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboardScreen").classList.remove("hidden");
    await syncMembersFromCloud();
    renderMemberTable();
}

function adminLogout() {
    localStorage.removeItem("isAdminLoggedIn");
    document.getElementById("adminDashboardScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
}

// ADD OR UPDATE MEMBER (SYNCED TO MONGODB ATLAS)
async function handleAddOrUpdateMember(e) {
    e.preventDefault();
    const cardNo = document.getElementById("newMemCardNo").value.trim();
    const name = document.getElementById("newMemName").value.trim();
    const phone = document.getElementById("newMemPhone").value.trim();
    const gatepass = document.getElementById("newMemGatepass").value.trim();
    const dailyWage = parseFloat(document.getElementById("newMemDailyWage").value) || 0.00;

    const memberData = { cardNo, name, phone, gatepass, dailyWage };

    try {
        const res = await fetch(`${API_BASE_URL}/members/${cardNo}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(memberData)
        });

        if (res.ok) {
            alert(`Member "${name}" saved successfully to MongoDB Atlas!`);
            await syncMembersFromCloud();
            cancelEdit();
            renderMemberTable();
        } else {
            alert("Failed to save member to cloud database.");
        }
    } catch (err) {
        console.error("Database connection error:", err);
        alert("Network error while connecting to MongoDB server.");
    }
}

function editMember(index) {
    const members = JSON.parse(localStorage.getItem("members")) || [];
    const member = members[index];

    if (member) {
        document.getElementById("editIndex").value = index;
        document.getElementById("newMemCardNo").value = member.cardNo;
        document.getElementById("newMemCardNo").disabled = true; // CardNo acts as unique ID
        document.getElementById("newMemName").value = member.name;
        document.getElementById("newMemPhone").value = member.phone;
        document.getElementById("newMemGatepass").value = member.gatepass;
        document.getElementById("newMemDailyWage").value = member.dailyWage;

        document.getElementById("formTitle").innerText = "✏️ Edit Member Details";
        document.getElementById("submitBtn").innerText = "Update Member";
        document.getElementById("submitBtn").className = "btn btn-primary";
        document.getElementById("cancelEditBtn").classList.remove("hidden");
    }
}

function cancelEdit() {
    document.getElementById("editIndex").value = "-1";
    document.getElementById("memberForm").reset();
    document.getElementById("newMemCardNo").disabled = false;
    document.getElementById("formTitle").innerText = "👥 Register New Member";
    document.getElementById("submitBtn").innerText = "Register Member";
    document.getElementById("submitBtn").className = "btn btn-admin";
    document.getElementById("cancelEditBtn").classList.add("hidden");
}

function renderMemberTable() {
    const members = JSON.parse(localStorage.getItem("members")) || [];
    const tbody = document.getElementById("memberTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    members.forEach((m, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${m.cardNo}</strong></td>
            <td>${m.name}</td>
            <td>₹${parseFloat(m.dailyWage || 0).toFixed(2)}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editMember(${index})">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addCustomHoliday() {
    const date = document.getElementById("customHolidayDate").value;
    const title = document.getElementById("customHolidayTitle").value;
    if (date && title) {
        customHolidays[date] = title;
        localStorage.setItem("customHolidays", JSON.stringify(customHolidays));
        alert(`Holiday "${title}" added successfully!`);
        document.getElementById("customHolidayDate").value = "";
        document.getElementById("customHolidayTitle").value = "";
    } else {
        alert("Please select a date and enter a title.");
    }
}

// --- CALENDAR & PAYROLL CALCULATION ---
async function fetchGoogleHolidays(year, member) {
    if (GOOGLE_API_KEY === "YOUR_GOOGLE_CALENDAR_API_KEY") {
        apiHolidays = {
            [`${year}-01-26`]: "Republic Day",
            [`${year}-08-15`]: "Independence Day",
            [`${year}-10-02`]: "Gandhi Jayanti",
            [`${year}-12-25`]: "Christmas"
        };
        renderCalendar(member);
        return;
    }

    const timeMin = new Date(year, 0, 1).toISOString();
    const timeMax = new Date(year, 11, 31).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(HOLIDAY_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.items) {
            apiHolidays = {};
            data.items.forEach(event => {
                if (event.start && event.start.date) {
                    apiHolidays[event.start.date] = event.summary;
                }
            });
        }
    } catch (err) {
        console.error("Calendar fetch error:", err);
    }
    renderCalendar(member);
}

function renderCalendar(member) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const grid = document.getElementById("calendarGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    document.getElementById("monthYearTitle").innerText = `${monthNames[month]} ${year}`;

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => {
        const h = document.createElement("div");
        h.className = "day-header";
        h.innerText = d;
        grid.appendChild(h);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement("div"));
    }

    let presentCount = 0;
    let holidayCount = 0;
    const allHolidays = { ...apiHolidays, ...customHolidays };

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month, day).getDay();

        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.innerHTML = `<span>${day}</span>`;

        if (allHolidays[dateStr]) {
            cell.classList.add("holiday");
            cell.innerHTML += `<span class="holiday-label" title="${allHolidays[dateStr]}">${allHolidays[dateStr]}</span>`;
            holidayCount++;
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            cell.classList.add("weekend");
        } else {
            cell.classList.add("present");
            presentCount++;
        }

        grid.appendChild(cell);
    }

    document.getElementById("totalDays").innerText = totalDays;
    document.getElementById("presentDays").innerText = presentCount;
    document.getElementById("holidayCount").innerText = holidayCount;

    calculatePayroll(member, presentCount, holidayCount);
}

function calculatePayroll(member, presentCount, holidayCount) {
    const dailyWage = parseFloat(member.dailyWage) || 0.00;
    const paidDays = presentCount + holidayCount;

    // Gross Salary = Daily Wage × Paid Days
    const gross = dailyWage * paidDays;

    // Statutory Deductions
    const pfBasic = Math.min(gross, 15000);
    const pf = pfBasic * 0.12;

    let esi = 0;
    if (gross <= 21000) {
        esi = gross * 0.0075;
    }

    const net = gross - (pf + esi);

    document.getElementById("paidDays").innerText = paidDays;
    document.getElementById("grossSalary").innerText = `₹${gross.toFixed(2)}`;
    document.getElementById("pfDeduction").innerText = `-₹${pf.toFixed(2)}`;
    document.getElementById("esiDeduction").innerText = `-₹${esi.toFixed(2)}`;
    document.getElementById("netSalary").innerText = `₹${net.toFixed(2)}`;
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    const member = JSON.parse(localStorage.getItem("loggedMember"));
    if (member) fetchGoogleHolidays(currentDate.getFullYear(), member);
}

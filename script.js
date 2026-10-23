const GOOGLE_API_KEY = "YOUR_GOOGLE_CALENDAR_API_KEY";
const HOLIDAY_CALENDAR_ID = "en.indian.official#holiday@group.v.calendar.google.com";

// Initialize default members if empty (with decimal numbers supported)
if (!localStorage.getItem("members")) {
    const initialMembers = [
        { cardNo: "SC-1001", name: "John Doe", phone: "9876543210", gatepass: "GP-101", dailyWage: 650.50, basic: 20000.00, allowance: 5000.00 },
        { cardNo: "SC-1002", name: "Jane Smith", phone: "9123456789", gatepass: "GP-102", dailyWage: 0.00, basic: 18000.00, allowance: 4000.00 }
    ];
    localStorage.setItem("members", JSON.stringify(initialMembers));
}

let currentDate = new Date();
let apiHolidays = {};
let customHolidays = JSON.parse(localStorage.getItem("customHolidays")) || {};

document.addEventListener("DOMContentLoaded", () => {
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
        document.getElementById("memberLoginError").innerText = "Invalid Safety Card Number. Try: SC-1001";
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

function showAdminDashboard() {
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboardScreen").classList.remove("hidden");
    renderMemberTable();
}

function adminLogout() {
    localStorage.removeItem("isAdminLoggedIn");
    document.getElementById("adminDashboardScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
}

function handleAddMember(e) {
    e.preventDefault();
    const cardNo = document.getElementById("newMemCardNo").value.trim();
    const name = document.getElementById("newMemName").value.trim();
    const phone = document.getElementById("newMemPhone").value.trim();
    const gatepass = document.getElementById("newMemGatepass").value.trim();
    
    // Parse decimal numbers accurately
    const dailyWage = parseFloat(document.getElementById("newMemDailyWage").value) || 0.00;
    const basic = parseFloat(document.getElementById("newMemBasic").value) || 0.00;
    const allowance = parseFloat(document.getElementById("newMemAllowance").value) || 0.00;

    let members = JSON.parse(localStorage.getItem("members")) || [];

    if (members.some(m => m.cardNo.toLowerCase() === cardNo.toLowerCase())) {
        alert("This Safety Card Number is already assigned!");
        return;
    }

    members.push({ cardNo, name, phone, gatepass, dailyWage, basic, allowance });
    localStorage.setItem("members", JSON.stringify(members));

    alert(`Member "${name}" registered successfully!\nSafety Card: ${cardNo}`);
    
    document.getElementById("newMemCardNo").value = "";
    document.getElementById("newMemName").value = "";
    document.getElementById("newMemPhone").value = "";
    document.getElementById("newMemGatepass").value = "";
    document.getElementById("newMemDailyWage").value = "0.00";
    document.getElementById("newMemBasic").value = "18000.00";
    document.getElementById("newMemAllowance").value = "4000.00";
    
    renderMemberTable();
}

function renderMemberTable() {
    const members = JSON.parse(localStorage.getItem("members")) || [];
    const tbody = document.getElementById("memberTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    members.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${m.cardNo}</strong></td>
            <td>${m.name}</td>
            <td>₹${parseFloat(m.dailyWage || 0).toFixed(2)}</td>
            <td>₹${parseFloat(m.basic || 0).toFixed(2)}</td>
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

// --- CALENDAR & PAYROLL CALCULATION (Decimal & Daily Wage Aware) ---
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

    calculatePayroll(member, presentCount, holidayCount, totalDays);
}

function calculatePayroll(member, presentCount, holidayCount, totalDays) {
    const dailyWage = parseFloat(member.dailyWage) || 0.00;
    const basic = parseFloat(member.basic) || 0.00;
    const allowance = parseFloat(member.allowance) || 0.00;

    let earnedBasicOrWage = 0;

    // If Daily Wage is set (> 0), calculate based on (Present Days + Paid Holidays) × Daily Wage
    if (dailyWage > 0) {
        const paidDays = presentCount + holidayCount;
        earnedBasicOrWage = dailyWage * paidDays;
    } else {
        // Otherwise use proportional basic salary calculation
        earnedBasicOrWage = basic * ((presentCount + holidayCount) / totalDays);
    }

    const gross = earnedBasicOrWage + allowance;
    const pfBasic = Math.min(basic > 0 ? basic : earnedBasicOrWage, 25000);
    const pf = pfBasic * 0.12;

    let esi = 0;
    if (gross <= 21000) {
        esi = gross * 0.0075;
    }

    const net = gross - (pf + esi);

    document.getElementById("dispBasic").innerText = `₹${earnedBasicOrWage.toFixed(2)}`;
    document.getElementById("dispAllowance").innerText = `₹${allowance.toFixed(2)}`;
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

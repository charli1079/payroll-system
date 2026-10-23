// Google Calendar API Config
const GOOGLE_API_KEY = "YOUR_GOOGLE_CALENDAR_API_KEY";
const HOLIDAY_CALENDAR_ID = "en.indian.official#holiday@group.v.calendar.google.com";

// Initialize LocalStorage with Sample Members if Empty
if (!localStorage.getItem("members")) {
    const initialMembers = [
        { cardNo: "SC-1001", name: "John Doe", phone: "9876543210", gatepass: "GP-101", basic: 20000, allowance: 5000 },
        { cardNo: "SC-1002", name: "Jane Smith", phone: "9123456789", gatepass: "GP-102", basic: 18000, allowance: 4000 }
    ];
    localStorage.setItem("members", JSON.stringify(initialMembers));
}

let currentDate = new Date();
let currentUser = null;
let apiHolidays = {};
let customHolidays = {};

// NAVIGATION
function showAdminLogin() {
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
    document.getElementById("memberLoginError").innerText = "";
}

function showMemberLogin() {
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("homeScreen").classList.remove("hidden");
    document.getElementById("adminLoginError").innerText = "";
}

// MEMBER LOGIN
function handleSafetyCardLogin(e) {
    e.preventDefault();
    const cardInput = document.getElementById("safetyCardNumber").value.trim();
    const members = JSON.parse(localStorage.getItem("members")) || [];

    const foundMember = members.find(m => m.cardNo.toLowerCase() === cardInput.toLowerCase());

    if (foundMember) {
        currentUser = { ...foundMember, role: "member" };
        startDashboard();
    } else {
        document.getElementById("memberLoginError").innerText = "Invalid Safety Card Number. Please check and try again.";
    }
}

// ADMIN LOGIN
function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    if (user === "admin" && pass === "admin123") {
        currentUser = { name: "Administrator", role: "admin" };
        startDashboard();
    } else {
        document.getElementById("adminLoginError").innerText = "Invalid Admin ID or Password!";
    }
}

// DASHBOARD
function startDashboard() {
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("dashboardScreen").classList.remove("hidden");

    if (currentUser.role === "admin") {
        document.getElementById("portalHeaderTitle").innerText = "Admin Control Center";
        document.getElementById("userWelcome").innerText = `Logged in as: Admin`;
        document.getElementById("adminHolidaySection").classList.remove("hidden");
        document.getElementById("adminMemberSection").classList.remove("hidden");
        document.getElementById("memberDetailCard").classList.add("hidden");
        renderMemberTable();
    } else {
        document.getElementById("portalHeaderTitle").innerText = "Employee Self-Service Portal";
        document.getElementById("userWelcome").innerText = `Welcome, ${currentUser.name} (${currentUser.cardNo})`;
        document.getElementById("adminHolidaySection").classList.add("hidden");
        document.getElementById("adminMemberSection").classList.add("hidden");
        
        document.getElementById("memberDetailCard").classList.remove("hidden");
        document.getElementById("infoMemName").innerText = currentUser.name;
        document.getElementById("infoMemPhone").innerText = currentUser.phone;
        document.getElementById("infoMemGatepass").innerText = currentUser.gatepass;
    }

    fetchGoogleHolidays(currentDate.getFullYear());
}

function logout() {
    currentUser = null;
    document.getElementById("safetyCardNumber").value = "";
    document.getElementById("dashboardScreen").classList.add("hidden");
    showMemberLogin();
}

// GOOGLE CALENDAR HOLIDAYS
async function fetchGoogleHolidays(year) {
    if (GOOGLE_API_KEY === "YOUR_GOOGLE_CALENDAR_API_KEY") {
        apiHolidays = {
            [`${year}-01-26`]: "Republic Day",
            [`${year}-08-15`]: "Independence Day",
            [`${year}-10-02`]: "Gandhi Jayanti",
            [`${year}-12-25`]: "Christmas"
        };
        renderCalendar();
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
    renderCalendar();
}

// RENDER CALENDAR
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const grid = document.getElementById("calendarGrid");
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

    calculatePayroll();
}

// PAYROLL & DEDUCTIONS
function calculatePayroll() {
    let basic = 0;
    let allowance = 0;

    if (currentUser.role === "member") {
        basic = parseFloat(currentUser.basic) || 0;
        allowance = parseFloat(currentUser.allowance) || 0;
    } else {
        basic = 20000;
        allowance = 5000;
    }

    const gross = basic + allowance;
    const pfBasic = Math.min(basic, 25000);
    const pf = Math.round(pfBasic * 0.12);

    let esi = 0;
    if (gross <= 21000) {
        esi = Math.ceil(gross * 0.0075);
    }

    const net = gross - (pf + esi);

    document.getElementById("dispBasic").innerText = `₹${basic.toLocaleString()}`;
    document.getElementById("dispAllowance").innerText = `₹${allowance.toLocaleString()}`;
    document.getElementById("grossSalary").innerText = `₹${gross.toLocaleString()}`;
    document.getElementById("pfDeduction").innerText = `-₹${pf.toLocaleString()}`;
    document.getElementById("esiDeduction").innerText = `-₹${esi.toLocaleString()}`;
    document.getElementById("netSalary").innerText = `₹${net.toLocaleString()}`;
}

// ADMIN MEMBER MANAGEMENT
function handleAddMember(e) {
    e.preventDefault();
    const cardNo = document.getElementById("newMemCardNo").value.trim();
    const name = document.getElementById("newMemName").value.trim();
    const phone = document.getElementById("newMemPhone").value.trim();
    const gatepass = document.getElementById("newMemGatepass").value.trim();
    const basic = parseFloat(document.getElementById("newMemBasic").value) || 0;
    const allowance = parseFloat(document.getElementById("newMemAllowance").value) || 0;

    let members = JSON.parse(localStorage.getItem("members")) || [];

    if (members.some(m => m.cardNo.toLowerCase() === cardNo.toLowerCase())) {
        alert("This Safety Card Number is already assigned!");
        return;
    }

    members.push({ cardNo, name, phone, gatepass, basic, allowance });
    localStorage.setItem("members", JSON.stringify(members));

    alert(`Member "${name}" registered successfully!\nSafety Card: ${cardNo}`);
    
    document.getElementById("newMemCardNo").value = "";
    document.getElementById("newMemName").value = "";
    document.getElementById("newMemPhone").value = "";
    document.getElementById("newMemGatepass").value = "";
    
    renderMemberTable();
}

function renderMemberTable() {
    const members = JSON.parse(localStorage.getItem("members")) || [];
    const tbody = document.getElementById("memberTableBody");
    tbody.innerHTML = "";
    members.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${m.cardNo}</strong></td>
            <td>${m.name}</td>
            <td>${m.phone}</td>
            <td>${m.gatepass}</td>
            <td>₹${m.basic}</td>
        `;
        tbody.appendChild(tr);
    });
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function addCustomHoliday() {
    const date = document.getElementById("customHolidayDate").value;
    const title = document.getElementById("customHolidayTitle").value;
    if (date && title) {
        customHolidays[date] = title;
        renderCalendar();
    }
}

// Google API Key & Config
const GOOGLE_API_KEY = "YOUR_GOOGLE_CALENDAR_API_KEY";
const HOLIDAY_CALENDAR_ID = "en.indian.official#holiday@group.v.calendar.google.com";

// Default Storage Setup
if (!localStorage.getItem("members")) {
    // Initial sample member
    const initialMembers = [
        { username: "john", code: "EMP101", basic: 20000, allowance: 5000 }
    ];
    localStorage.setItem("members", JSON.stringify(initialMembers));
}

let currentDate = new Date();
let currentUser = null; // Stores logged-in user details
let apiHolidays = {};
let customHolidays = {};

// AUTHENTICATION TAB SWITCHING
function switchTab(type) {
    document.getElementById("loginError").innerText = "";
    if (type === 'member') {
        document.getElementById("memberTabBtn").classList.add("active");
        document.getElementById("adminTabBtn").classList.remove("active");
        document.getElementById("memberLoginForm").classList.remove("hidden");
        document.getElementById("adminLoginForm").classList.add("hidden");
    } else {
        document.getElementById("adminTabBtn").classList.add("active");
        document.getElementById("memberTabBtn").classList.remove("active");
        document.getElementById("adminLoginForm").classList.remove("hidden");
        document.getElementById("memberLoginForm").classList.add("hidden");
    }
}

// MEMBER LOGIN
function handleMemberLogin(e) {
    e.preventDefault();
    const username = document.getElementById("memberUsername").value.trim();
    const code = document.getElementById("memberCode").value.trim();

    const members = JSON.parse(localStorage.getItem("members"));
    const found = members.find(m => m.username.toLowerCase() === username.toLowerCase() && m.code === code);

    if (found) {
        currentUser = { ...found, role: "member" };
        startDashboard();
    } else {
        document.getElementById("loginError").innerText = "Invalid Username or Access Code!";
    }
}

// ADMIN LOGIN
function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;

    // Default Credentials
    if (user === "admin" && pass === "admin123") {
        currentUser = { username: "Admin", role: "admin" };
        startDashboard();
    } else {
        document.getElementById("loginError").innerText = "Invalid Admin Credentials!";
    }
}

function startDashboard() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboardScreen").classList.remove("hidden");
    document.getElementById("userWelcome").innerText = `Logged in as: ${currentUser.username} (${currentUser.role.toUpperCase()})`;

    if (currentUser.role === "admin") {
        document.getElementById("adminHolidaySection").classList.remove("hidden");
        document.getElementById("adminMemberSection").classList.remove("hidden");
        renderMemberList();
    } else {
        document.getElementById("adminHolidaySection").classList.add("hidden");
        document.getElementById("adminMemberSection").classList.add("hidden");
    }

    fetchGoogleHolidays(currentDate.getFullYear());
}

function logout() {
    currentUser = null;
    document.getElementById("dashboardScreen").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
}

// GOOGLE CALENDAR API INTEGRATION
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
        console.error("Calendar API fetch failed:", err);
    }
    renderCalendar();
}

// CALENDAR RENDER & AUTO-ATTENDANCE
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

// SALARY, PF & ESI CALCULATION
function calculatePayroll() {
    let basic = 0;
    let allowance = 0;

    if (currentUser.role === "member") {
        basic = parseFloat(currentUser.basic) || 0;
        allowance = parseFloat(currentUser.allowance) || 0;
    } else {
        // Admin default view sample
        basic = 20000;
        allowance = 5000;
    }

    const gross = basic + allowance;

    // PF Calculation: 12% on Basic capped at ₹15,000 (Max ₹1,800)
    const pfBasic = Math.min(basic, 15000);
    const pf = Math.round(pfBasic * 0.12);

    // ESI Calculation: 0.75% of Gross if Gross <= ₹21,000
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
    const username = document.getElementById("newMemUser").value.trim();
    const code = document.getElementById("newMemCode").value.trim();
    const basic = parseFloat(document.getElementById("newMemBasic").value) || 0;
    const allowance = parseFloat(document.getElementById("newMemAllowance").value) || 0;

    const members = JSON.parse(localStorage.getItem("members"));
    members.push({ username, code, basic, allowance });
    localStorage.setItem("members", JSON.stringify(members));

    alert(`Member ${username} created successfully! Access Code: ${code}`);
    document.getElementById("newMemUser").value = "";
    document.getElementById("newMemCode").value = "";
    renderMemberList();
}

function renderMemberList() {
    const members = JSON.parse(localStorage.getItem("members"));
    const list = document.getElementById("memberList");
    list.innerHTML = "";
    members.forEach(m => {
        const li = document.createElement("li");
        li.innerHTML = `<span><strong>${m.username}</strong> (Code: ${m.code})</span> <span>Basic: ₹${m.basic}</span>`;
        list.appendChild(li);
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


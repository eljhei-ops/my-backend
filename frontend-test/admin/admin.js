const BACKEND = "https://my-backend-asx6.onrender.com";

/* ================================
   1. AUTH PROTECTION (IT ONLY)
================================ */
function requireIT() {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("user_type");
    const username = localStorage.getItem("user_name");

    if (!token || type !== "IT") {
        alert("Unauthorized access. IT users only.");
        window.location.href = "/front-test/login.html";
        return;
    }

    // If page has a user display
    const label = document.getElementById("currentUser");
    if (label) {
        label.innerText = "Logged in as: " + (username ?? "Unknown User");
    }
}

/* ================================
   2. LOGOUT
================================ */
function logout() {
    localStorage.clear();
window.location.href = "login.html";
;
}

/* ================================
   3. AUTH FETCH HELPER
================================ */
async function api(url, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    const res = await fetch(url, { ...options, headers });
    return res.json();
}

/* ================================
   4. LOAD IT DASHBOARD STATS
================================ */
async function loadStats() {
    try {
        const data = await api(`${BACKEND}/api/admin/stats`);

        if (document.getElementById("countUsers"))
            document.getElementById("countUsers").innerText = data.total_users;

        if (document.getElementById("countIT"))
            document.getElementById("countIT").innerText = data.total_it;

        if (document.getElementById("countAdmin"))
            document.getElementById("countAdmin").innerText = data.total_admin;

        if (document.getElementById("countClient"))
            document.getElementById("countClient").innerText = data.total_client;

    } catch (err) {
        console.error("Stats load failed:", err);
    }
}

/* ================================
   5. AUTO-INITIALIZER
================================ */
window.onload = () => {
    requireIT();

    // Load stats only if dashboard elements exist
    if (document.getElementById("countUsers")) {
        loadStats();
    }
};

/* ================================
   6. LOAD ALL USERS (View Users Page)
================================ */
async function loadUsers() {
    try {
        const data = await api(`${BACKEND}/api/admin/users`);

        if (!data.success) {
            console.error("Failed to load users");
            return;
        }

        const table = document.getElementById("userTable");
        table.innerHTML = "";

        data.users.forEach(user => {
            table.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.user_name}</td>
                <td>${user.user_type}</td>
                <td>${new Date(user.date_created).toLocaleString()}</td>
                <td>
                    <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>`;
        });

    } catch (err) {
        console.error("Error loading users:", err);
    }
}

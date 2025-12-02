const BACKEND = "https://my-backend-asx6.onrender.com";

// Allow only IT user_type
function requireIT() {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("user_type");

    if (!token || type !== "IT") {
        alert("Unauthorized access. IT only.");
        window.location.href = "/front-test/login.html";
        return;
    }

    document.getElementById("currentUser").innerText =
        "Logged in as: " + localStorage.getItem("username");
}

// Logout
function logout() {
    localStorage.clear();
    window.location.href = "/front-test/login.html";
}

// Fetch dashboard stats
async function loadStats() {
    const res = await fetch(`${BACKEND}/api/admin/stats`);
    const data = await res.json();

    document.getElementById("countUsers").innerText = data.total_users;
    document.getElementById("countIT").innerText = data.total_it;
    document.getElementById("countAdmin").innerText = data.total_admin;
    document.getElementById("countClient").innerText = data.total_client;
}

window.onload = () => {
    requireIT();
    loadStats();
};

const BACKEND = "https://my-backend-asx6.onrender.com";

/* ============================
   AUTH REQUIREMENT (ADMIN)
============================ */
function requireAdmin() {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("user_type");

    if (!token || type !== "Admin") {
        alert("Unauthorized. Admin Access Only.");
        window.location.href = "/frontend-test/login.html";
        return;
    }
}

/* ============================
   AUTH FETCH WRAPPER
============================ */
async function api(url, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    const res = await fetch(url, { ...options, headers });
    return res.json();
}

/* ============================
   LOGOUT
============================ */
function logout() {
    localStorage.clear();
    window.location.href = "/frontend-test/login.html";
}

/* ============================
   LOAD DASHBOARD COUNTS
============================ */
async function loadClaimStats() {
    const stats = await api(`${BACKEND}/api/admin2/claim-stats`);

    document.getElementById("countPending").innerText = stats.pending;
    document.getElementById("countApproved").innerText = stats.approved;
    document.getElementById("countDenied").innerText = stats.denied;
    document.getElementById("countResubmit").innerText = stats.resubmit;
}

/* ============================
   LOAD CLAIM TABLE
============================ */
async function loadClaims() {
    const data = await api(`${BACKEND}/api/admin2/claims`);

    const table = document.getElementById("claimsTable");
    table.innerHTML = "";

    data.claims.forEach(c => {
        table.innerHTML += `
            <tr>
                <td>${c.claim_id}</td>
                <td>${c.claim_code}</td>
                <td>${c.claim_amount}</td>
                <td>${c.hospital_name}</td>
                <td>${c.patient_name}</td>
                <td>${new Date(c.date_of_claim).toLocaleDateString()}</td>
                <td>${c.submitted_by}</td> 
                <td>${c.claim_status}</td>
                <td>${new Date(c.claim_date_created).toLocaleString()}</td>
                <td>${new Date(c.claim_date_updated).toLocaleString()}</td>
            </tr>
        `;
    });
}

/* ============================
   AUTO LOAD BASED ON PAGE
============================ */
window.onload = () => {
    requireAdmin();

    if (document.getElementById("countPending")) {
        loadClaimStats();
    }

    if (document.getElementById("claimsTable")) {
        loadClaims();
    }
};

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
                <td>
                    <button onclick="updateClaimStatus(${c.claim_id}, 'approve')" class="small-btn approve">Approve</button>
                    <button onclick="updateClaimStatus(${c.claim_id}, 'deny')" class="small-btn deny">Deny</button>
                    <button onclick="updateClaimStatus(${c.claim_id}, 'resubmit')" class="small-btn resubmit">Resubmit</button>
                </td>
            </tr>
        `;
    });
}

/* ============================
   UPDATE CLAIM STATUS
============================ */
async function updateClaimStatus(id, action) {
    const response = await api(`${BACKEND}/api/admin2/claims/${id}/${action}`, {
        method: "PUT"
    });

    if (response.error) {
        alert("Error: " + response.error);
        return;
    }

    alert(`Claim #${id} updated to: ${action}`);
    loadClaims();
}

/* ============================
   AUTO LOAD
============================ */
window.onload = () => {
    requireAdmin();
    loadClaims();
};


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
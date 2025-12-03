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
                <td>
                <button class="small-btn" onclick="openModal(${c.claim_id})"> Manage </button>
                </td>
            </tr>
        `;
    });
}

/* ============================
   MODAL LOGIC
============================ */
let selectedClaimId = null;

function openModal(id) {
    selectedClaimId = id;
    document.getElementById("modalTitle").innerText = `Update Claim #${id}`;
    document.getElementById("actionModal").style.display = "block";
}

function closeModal() {
    document.getElementById("actionModal").style.display = "none";
    selectedClaimId = null;
}


async function updateClaimStatus(action) {
    if (!selectedClaimId) return;

    const response = await api(`${BACKEND}/api/admin2/claims/${selectedClaimId}/${action}`, {
        method: "PUT"
    });

    if (response.error) {
        alert("Error: " + response.error);
        return;
    }

    alert("Claim updated successfully.");
    closeModal();
    loadClaims();
}

window.onload = () => {
    requireAdmin();

    // dashboard page
    if (document.getElementById("countPending")) {
        loadClaimStats();
    }

    // claims page
    if (document.getElementById("claimsTable")) {
        loadClaims();
    }

    // modal event listeners (only exist on claims page)
    if (document.getElementById("approveBtn")) {
        document.getElementById("approveBtn").onclick = () => updateClaimStatus("approve");
        document.getElementById("denyBtn").onclick = () => updateClaimStatus("deny");
        document.getElementById("resubmitBtn").onclick = () => updateClaimStatus("resubmit");
    }
};


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



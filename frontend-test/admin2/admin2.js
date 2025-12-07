const BACKEND = "https://my-backend-asx6.onrender.com";

let allClaims = [];
let currentSort = { column: null, direction: "asc" };

/* ============================
   REQUIRE ADMIN LOGIN
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
   AUTHENTICATED FETCH
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
   LOAD CLAIMS TABLE
============================ */
async function loadClaims() {
    const data = await api(`${BACKEND}/api/admin2/claims`);
    allClaims = data.claims;
    applyFilters();
}

/* ============================
   UPDATE CLAIM STATUS
============================ */
async function updateClaimStatus(id, action) {
    const confirmed = confirm(`Are you sure you want to update Claim #${id} to "${action}"?`);
    if (!confirmed) return;

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
   DASHBOARD STATISTICS
============================ */
async function loadClaimStats() {
    const stats = await api(`${BACKEND}/api/admin2/claim-stats`);

    document.getElementById("countPending").innerText = stats.pending;
    document.getElementById("countApproved").innerText = stats.approved;
    document.getElementById("countDenied").innerText = stats.denied;
    document.getElementById("countResubmit").innerText = stats.resubmit;
}

/* ============================
   SORTING BY HEADER CLICK
============================ */
document.addEventListener("DOMContentLoaded", () => {

    // Enable sorting headers
    document.querySelectorAll("#headerRow th[data-col]").forEach(th => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
            const column = th.dataset.col;

            // Toggle sort direction
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
            } else {
                currentSort.column = column;
                currentSort.direction = "asc";
            }

            applyFilters();
        });
    });

    // Global search event (check if exists)
    const globalSearchBox = document.getElementById("globalSearch");
    if (globalSearchBox) {
        globalSearchBox.addEventListener("input", applyFilters);
    }
});

/* ============================
   PER-COLUMN FILTERING
============================ */
document.addEventListener("input", (e) => {
    if (e.target.classList.contains("filterInput")) {
        applyFilters();
    }
});

/* ============================
   FILTER + SEARCH + SORT
============================ */
function applyFilters() {
    let filtered = [...allClaims];

    /* --- COLUMN FILTERS --- */
    document.querySelectorAll(".filterInput").forEach(input => {
        const col = input.dataset.col;
        const val = input.value.toLowerCase();

        if (val.trim() !== "") {
            filtered = filtered.filter(row =>
                String(row[col]).toLowerCase().includes(val)
            );
        }
    });

    /* --- GLOBAL SEARCH --- */
    const searchBox = document.getElementById("globalSearch");
    if (searchBox) {
        const searchValue = searchBox.value.toLowerCase();

        if (searchValue.trim() !== "") {
            filtered = filtered.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(searchValue)
                )
            );
        }
    }

    /* --- SORTING --- */
    if (currentSort.column) {
        filtered.sort((a, b) => {
            let x = a[currentSort.column];
            let y = b[currentSort.column];

            if (String(x).includes("T")) x = new Date(x);
            if (String(y).includes("T")) y = new Date(y);

            if (!isNaN(x) && !isNaN(y)) {
                x = Number(x);
                y = Number(y);
            }

            if (x < y) return currentSort.direction === "asc" ? -1 : 1;
            if (x > y) return currentSort.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    renderClaims(filtered);
}

/* ============================
   RENDER CLAIM ROWS
============================ */
function renderClaims(claims) {
    const table = document.getElementById("claimsTable");
    table.innerHTML = "";

    claims.forEach(c => {
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
   AUTO LOAD ON PAGE OPEN
============================ */
window.onload = () => {
    requireAdmin();
    loadClaims();
    loadClaimStats();
};

const BACKEND = "https://my-backend-asx6.onrender.com";

function requireClient() {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("user_type");
    if (!token || type !== "Client") {
        alert("Unauthorized. Client Access Only.");
        window.location.href = "/frontend-test/login.html";
    }
}

async function api(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    return res.json();
}

function logout() {
    localStorage.clear();
    window.location.href = "/frontend-test/login.html";
}

// Load dashboard stats
async function loadClientStats() {
    const stats = await api(`${BACKEND}/api/client/stats`);
    document.getElementById("pendingCount").innerText = stats.pending;
    document.getElementById("approvedCount").innerText = stats.approved;
    document.getElementById("deniedCount").innerText = stats.denied;
    document.getElementById("resubmitCount").innerText = stats.resubmit;
}

// Submit claim
async function submitClaim() {
    const claim = {
        claim_code: document.getElementById("claim_code").value,
        claim_amount: document.getElementById("claim_amount").value,
        hospital_name: document.getElementById("hospital_name").value,
        patient_name: document.getElementById("patient_name").value,
        date_of_claim: document.getElementById("date_of_claim").value,
        submitted_by: parseInt(localStorage.getItem("id"))
    };

    const res = await api(`${BACKEND}/api/client/submit`, {
        method: "POST",
        body: JSON.stringify(claim)
    });

    if (res.error) return alert(res.error);

    alert("Claim submitted successfully!");
    document.getElementById("claimForm").reset();
}

// Load submitted claims
async function loadSubmittedClaims() {
    const data = await api(`${BACKEND}/api/client/my-claims`);
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
                <td>${c.claim_status}</td>
                <td>${new Date(c.claim_date_created).toLocaleString()}</td>
                <td>${new Date(c.claim_date_updated).toLocaleString()}</td>
            </tr>
        `;
    });
}

// Auto-load
window.onload = () => {
    requireClient();

    if (document.getElementById("pendingCount")) loadClientStats();
    if (document.getElementById("claimsTable")) loadSubmittedClaims();
};

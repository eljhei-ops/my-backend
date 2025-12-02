function logout() {
    localStorage.removeItem("logged_in");
    localStorage.removeItem("user_type");
    window.location.href = "/home.html";
}

// Page access control
function requireAdmin() {
    const type = localStorage.getItem("user_type");
    if (!type || (type !== "IT" && type !== "ADMIN")) {
        alert("Access denied.");
        window.location.href = "/home.html";
    }
}

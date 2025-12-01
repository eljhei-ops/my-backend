const BACKEND_URL = "https://my-backend-asx6.onrender.com";

// ================================
// 1. Check Backend Connection
// ================================
fetch(BACKEND_URL)
  .then(res => res.text())
  .then(data => {
    document.getElementById("backendStatus").innerText = data;
  })
  .catch(err => {
    document.getElementById("backendStatus").innerText =
      "Cannot connect to backend ❌";
  });

// ================================
// 2. AI FAQ Button (REAL AI VERSION)
// ================================
async function askAI() {
  const userMessage = document.getElementById("userInput").value;

  if (!userMessage.trim()) {
    alert("Please enter a message.");
    return;
  }

  // Show loading text while waiting
  document.getElementById("aiResponse").style.display = "block";
  document.getElementById("aiResponse").innerText = "Thinking... 🤖";

  try {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await res.json();

    document.getElementById("aiResponse").innerText = data.reply;

  } catch (error) {
    document.getElementById("aiResponse").innerText =
      "Error connecting to AI ❌";
  }
}

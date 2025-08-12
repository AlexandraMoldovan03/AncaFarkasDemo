document.getElementById("buyButton1").addEventListener("click", async () => {
  const response = await fetch("http://localhost:3000/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ itemId: 1 })
  });

  const data = await response.json();
  window.location.href = data.url;
});

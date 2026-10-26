const databaseURL = "https://hackthon-project-e419c-default-rtdb.firebaseio.com";
const dbSecret = "Ngp7JKNhSkHoLtxlDvwrUX7uMTzcZS7inPADcslU";

async function checkRTDB() {
  const res = await fetch(`${databaseURL}/.json?auth=${dbSecret}`);
  const data = await res.json();
  console.log("Current RTDB keys:", Object.keys(data || {}));
}

checkRTDB();

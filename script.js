const loginPanel = document.getElementById("login").classList;
const writePanel = document.getElementById("write").classList;
const readPanel = document.getElementById("read").classList;

async function showLogin() {
  loginPanel.add("d-none");
  writePanel.add("d-none");
  readPanel.add("d-none");
}

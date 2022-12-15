import {
  getSolidDataset,
  getThing,
  setThing,
  getStringNoLocale,
  setStringNoLocale,
  saveSolidDatasetAt,
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import { VCARD } from "@inrupt/vocab-common-rdf";

// If your Pod is *not* on `solidcommunity.net`, change this to your identity provider.
const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
document.getElementById(
  "solid_identity_provider"
).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

const NOT_ENTERED_WEBID =
  "...not logged in yet - but enter any WebID to read from its profile...";

const session = new Session();

let storage = []; //Update Andrea Vitti

const buttonLogin = document.getElementById("btnLogin");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");

// 1a. Start Login Process. Call session.login() function.
async function login() {
  if (!session.info.isLoggedIn) {
    await session.login({
      oidcIssuer: SOLID_IDENTITY_PROVIDER,
      clientName: "Inrupt tutorial client app",
      redirectUrl: window.location.href,
    });
  }
}

// 1b. Login Redirect. Call session.handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
  await session.handleIncomingRedirect(window.location.href);
  if (session.info.isLoggedIn) {
    // Update the page with the status.
    document.getElementById(
      "labelStatus"
    ).innerHTML = `<small>Your session is logged in with the WebID [<a target="_blank" class="longurl" href="${session.info.webId}">${session.info.webId}</a>].</small>`;
    document.getElementById("labelStatus").setAttribute("role", "alert");
    document.getElementById("webID").value = session.info.webId;
  }

  //? Next feature to do
  /*document.getElementById("input_name").setAttribute("placeholder", "");
  document.getElementById("input_email").setAttribute("placeholder", "");*/

  readProfile(); //Updated by Andrea Vitti read the information from the user that has just logged
}

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
handleRedirectAfterLogin();

// 2. Write to profile
async function writeProfile() {
  //Updates Andrea Vitti
  storage = [];
  const name = document.getElementById("input_name").value;
  const email = document.getElementById("input_email").value;
  const gender = document.getElementById("input_gender").value;
  storage.push(name, email, gender);
  for (let i = 0; i < storage.length; i++) {
    if (storage[i] === "") {
      storage.splice(i, 1);
    }
  }

  console.log(storage);

  //END Updates Andrea Vitti

  if (!session.info.isLoggedIn) {
    // You must be authenticated to write.
    document.getElementById(
      "labelWriteStatus"
    ).textContent = `...you can't write [${storage}] until you first login!`; //update by Andrea Vitti
    document.getElementById("labelWriteStatus").setAttribute("role", "alert");
  }

  const webID = session.info.webId;
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: session.fetch,
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);

  // Using the name provided in text field, update the name in your profile.
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.
  profile = setStringNoLocale(profile, VCARD.fn, name);

  //Updates Andrea Vitti
  profile = setStringNoLocale(profile, VCARD.email, email);
  profile = setStringNoLocale(profile, VCARD.Gender, gender);
  //Updates End Andrea Vitti

  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);
  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch,
  });

  // Update the page with the retrieved values.
  const labelWriteStatus = document.getElementById("labelWriteStatus");
  labelWriteStatus.textContent = `Wrote [${storage}] in your vcard successfully!`;
  labelWriteStatus.setAttribute("role", "alert");
  labelWriteStatus.classList.add("longurl");
}

// 3. Read profile
async function readProfile() {
  const webID = document.getElementById("webID").value;

  if (webID === NOT_ENTERED_WEBID) {
    document.getElementById(
      "labelFN"
    ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
    return false;
  }

  try {
    new URL(webID);
  } catch (_) {
    document.getElementById(
      "labelFN"
    ).textContent = `Provided WebID [${webID}] is not a valid URL - please try again`;
    return false;
  }

  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // Profile is public data; i.e., you do not need to be logged in to read the data.
  // For illustrative purposes, shows both an authenticated and non-authenticated reads.

  let myDataset;
  try {
    if (session.info.isLoggedIn) {
      myDataset = await getSolidDataset(profileDocumentUrl.href, {
        fetch: session.fetch,
      });
    } else {
      myDataset = await getSolidDataset(profileDocumentUrl.href);
    }
  } catch (error) {
    document.getElementById(
      "labelFN"
    ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
    return false;
  }

  const profile = getThing(myDataset, webID);

  // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

  //Updates by Andrea Vitti
  //Get vCard Info
  const formattedName = getStringNoLocale(profile, VCARD.fn);
  const formattedEmail = getStringNoLocale(profile, VCARD.email);
  const formattedGender = getStringNoLocale(profile, VCARD.Gender);
  const content = document.getElementById("labelFN");
  storage = [];
  storage.push(formattedName, formattedEmail, formattedGender);
  // Update the page with the retrieved values.
  content.textContent = "";

  for (let i = 0; i < storage.length; i++) {
    if (storage[i] !== "") {
      content.textContent += `[${storage[i]}]`;
    }
  }

  if (content.textContent === "") {
    content.textContent = "...not read yet...";
  }
  document.getElementById("mh-1").innerHTML = `${formattedName}'s vCard`;

  document.getElementById("mb-1").innerHTML = `
  <div class="container">
  <div class="row">
  <div class="col">
  <section>
  <label for="field-name">Name:</label>
  <p id="field-name">${formattedName}</p>
  </section>
  </div>

 <div class="col">
 <section>
 <label for="field-email">Email:</label>
 <p id="field-email">${formattedEmail}</p>
 </section>
  </div>
  
   <div class="col">
 <section>
 <label for="field-email">Gender:</label>
 <p id="field-email">${formattedGender}</p>
 </section>
  </div>

    <div class="col">
 <section>
 <label for="field-email">Gender:</label>
 <p id="field-email">${formattedGender}</p>
 </section>
  </div>  <div class="col">
 <section>
 <label for="field-email">Gender:</label>
 <p id="field-email">${formattedGender}</p>
 </section>
  </div>  <div class="col">
 <section>
 <label for="field-email">Gender:</label>
 <p id="field-email">${formattedGender}</p>
 </section>
  </div>


  </div>
  </div>
  
 
  `;
  //Updates End Andrea Vitti
}

buttonLogin.onclick = function () {
  login();
};

writeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  writeProfile();
});

readForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readProfile();
});

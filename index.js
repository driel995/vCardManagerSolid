import {
  getSolidDataset,
  getStringNoLocaleAll,
  getStringNoLocale,
  setStringNoLocale,
  saveSolidDatasetAt,
  getPodUrlAll,
  getSourceUrl,
  overwriteFile,
  getThing,
  createThing,
  setThing,
  getDate,
  getUrl,
  setUrl,
  getUrlAll,
  addUrl,
  removeUrl,
} from "@inrupt/solid-client";

import { Session } from "@inrupt/solid-client-authn-browser";

import { VCARD, FOAF } from "@inrupt/vocab-common-rdf";

//? Other functionalities  that could turn useful in my project
import {
  getFile,
  saveFileInContainer,
  isRawData,
  getContentType,
  addStringNoLocale,
  createSolidDataset,
  getDateAll,
  getStringByLocaleAll,
  removeAll,
  setDate,
  setDatetime,
} from "@inrupt/solid-client";
//?or vocabularies
import { SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";

// If your Pod is *not* on `solidcommunity.net`, change this to your identity provider.
const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
document.getElementById(
  "solid_identity_provider"
).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

const NOT_ENTERED_WEBID =
  "...not logged in yet - but enter any WebID to read from its profile...";

const session = new Session();

//Updates Andrea Vitti
let storage = []; //Array for storing data read or wrote on the profile

let podUrl; //logged user pod url

//flags for any vcard data to apply changes on - not required for the avatar
let cname, cemail, cbirth, cgender, ccountry;

//End Updates Andrea Vitti

//Get inputFields elements
const inputName = document.querySelector("#input_name");
const inputEmail = document.querySelector("#input_email");
const inputBirth = document.querySelector("#input_birth");
const inputGender = document.querySelector("#input_gender");
const inputCountry = document.querySelector("#input_country");
const inputPhoto = document.querySelector("#input_img");

//End Updates Andrea Vitti
const buttonLogin = document.getElementById("btnLogin");
const buttonLogout = document.getElementById("btnLogout");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");
const buttonFriend = document.getElementById("addfriend");
const buttonRemove = document.getElementById("removefriend");

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
  await session.handleIncomingRedirect({
    restorePreviousSession: true /*this option allows to store already authenticated user. 
                                   Default would be window.location.href*/,
  });

  if (session.info.isLoggedIn) {
    // Update the page with the status.
    document.getElementById(
      "labelStatus"
    ).innerHTML = `<small>Your session is logged in with the WebID [<a target="_blank" class="longurl" href="${session.info.webId}">${session.info.webId}</a>].</small>`;
    document.getElementById("labelStatus").setAttribute("role", "alert");
    document.getElementById("webID").value = session.info.webId;

    //Updates Andrea Vitti

    //Fetch User's Pod Url
    podUrl = await getPodUrlAll(webID, { fetch: fetch });
  }
  //Read profile info after logging in
  readProfile();
  //End Updates Andrea Vitti
}

//Logout
async function exit() {
  if (session.info.isLoggedIn) {
    await session.logout();
  }
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
  const birthday = document.getElementById("input_birth").value;
  const gender = document.getElementById("input_gender").value;
  const country = document.getElementById("input_country").value;

  const file = document.querySelector("#input_img")["files"][0];

  storage.push(name, email, birthday, gender, country);

  if (file) {
    storage.push("New Avatar");
  }

  for (let i = 0; i < storage.length; i++) {
    if (storage[i] === "") {
      storage.splice(i, 1);
    }
  }

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

  // Updates Andrea Vitti

  // Email update
  let mailThing;
  let mailUrl = getUrl(profile, VCARD.hasEmail);
  const mailLink = "mailto:" + email;

  // If there's already a saved email
  if (mailUrl != null) {
    // Take the dataset for the hasEmail property

    let mailDataset = await getSolidDataset(mailUrl, {
      fetch: session.fetch,
    });

    mailThing = getThing(mailDataset, mailUrl);
    mailThing = setUrl(mailThing, VCARD.value, mailLink);
    mailDataset = setThing(mailDataset, mailThing); //Update the dataset with the new email

    await saveSolidDatasetAt(mailUrl, mailDataset, {
      fetch: session.fetch,
    });
  } else {
    mailThing = createThing();
    mailThing = setUrl(mailThing, VCARD.value, mailLink);
    myProfileDataset = setThing(myProfileDataset, mailThing);
    mailUrl = mailThing.url.slice(46);
    mailUrl = profileDocumentUrl.href + "#" + mailUrl;
    profile = setUrl(profile, VCARD.hasEmail, mailUrl);
  }
  //End Email update

  //Birthday update
  const birthdate = new Date(birthday)
    .toISOString()
    .split("T", 1)[0]; /*Convert the date in a string in format yyyy-mm-dd*/

  profile = setStringNoLocale(profile, VCARD.bday, birthdate);

  //? Not used since, in function setDate(), there's a bug that appends a Z char to the date string
  /*const birthdate = new Date(birthday);
  profile = setDate(profile, VCARD.bday, birthdate);*/

  //End Birthday update

  //Gender update
  profile = setStringNoLocale(profile, VCARD.Gender, gender);

  //Address.country update
  let addressThing;
  let addressUrl = getUrl(profile, VCARD.hasAddress);

  // If there's already a saved address
  if (addressUrl != null) {
    // Take the dataset for the hasAddressproperty

    let addressDataset = await getSolidDataset(addressUrl, {
      fetch: session.fetch,
    });

    addressThing = getThing(addressDataset, addressUrl);
    addressThing = setStringNoLocale(addressThing, VCARD.country_name, country);
    addressDataset = setThing(addressDataset, addressThing); //Update the dataset with the new address

    await saveSolidDatasetAt(addressUrl, addressDataset, {
      fetch: session.fetch,
    });
  } else {
    addressThing = createThing();
    addressThing = setStringNoLocale(addressThing, VCARD.country_name, country);
    myProfileDataset = setThing(myProfileDataset, addressThing);
    addressUrl = addressThing.url.slice(46);
    addressUrl = profileDocumentUrl.href + "#" + addressUrl;
    profile = setUrl(profile, VCARD.hasAddress, addressUrl);
  }
  // End Address update

  //Avatar update
  //Instead of "c" flags, avatar modifications can be spotted by checking if a file has been uploaded
  if (file) {
    document.querySelector("#writeimg").innerHTML =
      'Upload your profile pic: <i class="fa-solid fa-check"></i>';

    let avatarUrl = podUrl + "profile/avatar.png"; //Define a URL for the new avatar
    placeFileInContainer(file, avatarUrl);
    profile = setUrl(profile, VCARD.hasPhoto, avatarUrl); //specify the avatar URL in the relative property
  }
  //End avatar update

  //Updates End Andrea Vitti

  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);
  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch,
  });

  // Update the page with the retrieved values.
  const labelWriteStatus = document.getElementById("labelWriteStatus");
  labelWriteStatus.innerHTML = `<dt>Wrote [${storage}] in your vcard successfully!</dt>`;
  labelWriteStatus.setAttribute("role", "alert");
  labelWriteStatus.classList.add("str-print");

  //Updates Andrea Vitti

  //Show on which data modifies were applied
  if (cname) {
    document.querySelector("#writename").innerHTML =
      'Write your name: <i class="fa-solid fa-check"></i>';
    cname = false;
  }
  if (cemail) {
    document.querySelector("#writeemail").innerHTML =
      'Write your email: <i class="fa-solid fa-check"></i>';
    cemail = false;
  }
  if (cbirth) {
    document.querySelector("#writebirth").innerHTML =
      'Write your birthday: <i class="fa-solid fa-check"></i>';
    cbirth = false;
  }
  if (cgender) {
    document.querySelector("#writegender").innerHTML =
      'Select your gender: <i class="fa-solid fa-check"></i>';
    cgender = false;
  }
  if (ccountry) {
    document.querySelector("#writecountry").innerHTML =
      'Select your country: <i class="fa-solid fa-check"></i>';
    ccountry = false;
  }

  readProfile();
  //End Updates Andrea Vitti
}

// 3. Read profile
async function readProfile(id = null) {
  let webID;

  webID = document.getElementById("webID").value;
  if (webID == session.info.webId) {
    document.querySelector("#write").classList.remove("d-none");
  } else {
    document.querySelector("#write").classList.add("d-none");
  }
  if (webID === NOT_ENTERED_WEBID) {
    document.getElementById(
      "labelFN"
    ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
    return false;
  }
  if (id) {
    webID = id;
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

  let userDataset;
  try {
    if (session.info.isLoggedIn) {
      userDataset = await getSolidDataset(profileDocumentUrl.href, {
        fetch: session.fetch,
      });
    } else {
      userDataset = await getSolidDataset(profileDocumentUrl.href);
    }
  } catch (error) {
    document.getElementById(
      "labelFN"
    ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
    return false;
  }

  let profile = getThing(userDataset, webID);

  // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

  //Updates by Andrea Vitti
  //Get vCard Info
  const formattedName = getStringNoLocale(profile, VCARD.fn);

  //?Implementare per ogni hasEmail presente nel profilo

  // Get email
  let formattedEmail = "";
  let mailLink = "";
  const mailUrl = getUrl(profile, VCARD.hasEmail);
  if (mailUrl != null) {
    const mailThing = getThing(userDataset, mailUrl);
    if (mailThing != null) {
      mailLink =
        mailThing.predicates["http://www.w3.org/2006/vcard/ns#value"]
          .namedNodes[0];
    }
    formattedEmail = mailLink.replace("mailto:", "");
  }
  //End Get email

  //Get birthday
  //The application saves the date as a string in the vCard, while the POD uses a date obj.
  let birth = getStringNoLocale(profile, VCARD.bday); //1. Get the information as a string
  let formattedBirth;
  //2. If it's not a valid string, retrieve the information as a date obj and format it
  if (birth == null) {
    birth = getDate(profile, VCARD.bday);
    formattedBirth = Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(birth);
  } //If it's a valid string, use it
  else {
    formattedBirth = birth;
  }
  //End Get birthday

  const formattedGender = getStringNoLocale(profile, VCARD.Gender); //Get gender

  //Get address
  let formattedCountry = "";
  let addressThing;
  const addressUrl = getUrl(profile, VCARD.hasAddress);
  if (addressUrl != null) {
    addressThing = getThing(userDataset, addressUrl);
  }
  if (addressThing != null) {
    formattedCountry =
      addressThing.predicates["http://www.w3.org/2006/vcard/ns#country-name"]
        .literals["http://www.w3.org/2001/XMLSchema#string"][0];
  }
  //End Get address

  const avatar = getUrl(profile, VCARD.hasPhoto);

  const content = document.getElementById("labelFN");

  storage = [];
  storage.push(
    formattedName,
    formattedEmail,
    formattedBirth,
    formattedGender,
    formattedCountry,
    "Avatar"
  );

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

  //Updates the input fields with the retrieved values
  inputName.value = formattedName;
  inputEmail.value = formattedEmail;
  inputBirth.value = formattedBirth;
  inputGender.value = formattedGender;
  inputCountry.value = formattedCountry;

  //Update the vcard modal with the retrieved values.
  document.getElementById("mh-1").innerHTML = `${formattedName}'s vCard`;

  document.getElementById("mb-1").innerHTML = `
  <div class="row">
  <div class="col-6">
  <section>
  <img src="${avatar}" class="propic rounded">
  </section>
  </div>

  <div class="col-6">
  <section>
  <p class="text-center">Links:
  <ul class="links">
  <li><a href="#" class="text-muted"><i class="fa-brands fa-linkedin"></i> Linkedin</a></li>
  <li><a href="#" class="text-muted"><i class="fa-brands fa-facebook-messenger"></i> Facebook</a></li>
  <li><a href="#" class="text-muted"><i class="fa-brands fa-github"></i> Github</a></li>
  <li><a href="#" class="text-muted"><i class="fa-solid fa-layer-group"></i> POD</a></li>

  </ul>
  </p>
  </section></div>
  </div>

  <div class="row">
  <div class="col-6">
  <section>
  <label for="field-name">Fullname:</label>
  <p id="field-name">${formattedName}</p>
  </section>
  </div>

  <div class="col-6">
  <section>
 <label for="field-gender">Gender:</label>
 <p id="field-gender">${formattedGender}</p>
 </section>
  </div>
  </div>

  <div class="row">



 
<div class="col-6">
<section>
 <label for="field-email">Email:</label>
 <p id="field-email"><a href="${mailLink}">${formattedEmail}</a></p>
 </section>




  </div>

   <div class="col-4">

   <section>
 <label for="field-country">Country:</label>
 <p id="field-country">${formattedCountry}</p>
 </section>

 
  </div> 

  </div>


<div class="row">

<div class="col-6">
<section>
 <label for="field-birth">Birthday:</label>
 <p id="field-birth">${formattedBirth}</p>
 </section>
</div>

<div class="col-6">
  
  </div>

 
  



  </div>
<div class="row">


    <div class="col-6">
 
  </div>


  

</div>

  
  
 
  `;

  //Show vcard modal footer for functions' buttons
  if (!session.info.isLoggedIn) {
    document.getElementById("vcardfooter").innerHTML =
      "<p class='text-center text-muted'>You must be authenticated to add this person to your friends list or sending a message</p>";
  }

  //*Get friends list

  let myWebID = session.info.webId;

  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  let myProfileDocumentUrl = new URL(myWebID);
  myProfileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(myProfileDocumentUrl.href, {
    fetch: session.fetch,
  });

  // The profile data is a "Thing" in the profile dataset.
  profile = getThing(myProfileDataset, myWebID);

  let friendsUrl = getUrlAll(profile, FOAF.knows); //get url of all friends
  let friendsList = [];

  if (friendsUrl.length != 0) {
    for (let i = 0; i < friendsUrl.length; i++) {
      const personUrl = friendsUrl[i];
      const myFriendDataset = await getSolidDataset(personUrl, {
        fetch: session.fetch,
      });

      const personProfile = getThing(myFriendDataset, personUrl);
      const personName = getStringNoLocaleAll(personProfile, VCARD.fn);
      const personAvatar = getUrl(personProfile, VCARD.hasPhoto);

      const friend = {
        name: personName[0],
        url: personUrl,
        avatar: personAvatar,
      };

      friendsList.push(friend);
    }

    if (friendsUrl.includes(webID)) {
      document.getElementById("addfriend").classList.add("d-none");
      document.getElementById("removefriend").classList.remove("d-none");
    } else {
      document.getElementById("removefriend").classList.add("d-none");
      document.getElementById("addfriend").classList.remove("d-none");
    }
  } else {
    document.getElementById("removefriend").classList.add("d-none");
    document.getElementById("addfriend").classList.remove("d-none");
  }
  //End get friends list

  //Update the friends modal with the user friend list
  document.getElementById("mh-2").innerHTML = `${formattedName}'s Friend List`;
  if (friendsList.length != 0) {
    document.getElementById("mb-2").innerHTML = `<ul id="friendlist"></ul>`;

    for (let i = 0; i < friendsList.length; i++) {
      if (friendsList[i]["avatar"] != null) {
        document.getElementById("friendlist").innerHTML += `
  <li class="friendelem" id="${friendsList[i]["url"]}">
  <a href="${friendsList[i]["url"]}">${friendsList[i]["name"]}  </a>
  <img src="${friendsList[i]["avatar"]}" class="friend-pic img-fluid img-thumbnail"> 
  <button type="button" class="btn btn-primary w-25 auxbtnread" data-user="${friendsList[i]["url"]}"> 
  <i class="fa-solid fa-glasses" > </i> Read </button>
  <button type="button" class="btn btn-danger w-25 auxbtnremove" data-user="${friendsList[i]["url"]}" data-fn="${friendsList[i]["name"]}"> 
  <i class="fa-solid fa-xmark" > </i> Remove </button>
  </li>`;
      } else {
        document.getElementById("friendlist").innerHTML += `
        <li class="friendelem" id="${friendsList[i]["url"]}"><a href="${friendsList[i]["url"]}">${friendsList[i]["name"]}  </a> 
        <button type="button" class="btn btn-primary w-25 auxbtnread" data-user="${friendsList[i]["url"]}"> <i class="fa-solid fa-glasses" > </i>
         Read </button>

  <button type="button" class="btn btn-danger w-25 auxbtnremove" data-user="${friendsList[i]["url"]}" data-fn="${friendsList[i]["name"]}" > 
  <i class="fa-solid fa-xmark" ></i> Remove </button>
  </li>`;
      }
    }

    let list = document.querySelector("#friendlist");

    list.addEventListener("click", (e) => {
      if (e.target.classList.contains("auxbtnremove")) {
        buttonFriend.innerHTML = "Add Friend";

        if (
          confirm(
            "Are you sure you want to remove " +
              e.target.getAttribute("data-fn") +
              " from your friends list?"
          ) == true
        ) {
          removeFriend(e.target.getAttribute("data-user"));

          for (let i = 0; i < friendsList.length; i++) {
            if (friendsList[i]["url"] == e.target.getAttribute("data-user")) {
              document
                .getElementById(friendsList[i]["url"])
                .classList.add("d-none");
              friendsList.splice(i, 1);
            }
          }

          if (friendsList.length == 0) {
            document.getElementById(
              "mb-2"
            ).innerHTML = `<p>No friends in your list. </p> `;
          }
          readProfile();
        }
      }

      if (e.target.classList.contains("auxbtnread")) {
        readProfile(e.target.getAttribute("data-user"));
      }
    });
  } else {
    document.getElementById(
      "mb-2"
    ).innerHTML = `<p>No friends in your list. </p> `;
  }
}

//Upload file into the targetContainer.
async function placeFileInContainer(file, targetContainerURL) {
  try {
    const savedFile = await overwriteFile(
      targetContainerURL, // Container URL
      file, // File
      {
        slug: file.name,
        contentType: file.type,
        fetch: session.fetch, //this consent the operation to be made using the current user logged in session, otherwise it produces an error of illegal invocation or 401
      }
    );
    console.log(`File saved at ${getSourceUrl(savedFile)}`);
  } catch (error) {
    console.error(error);
  }
}

//*Add a new friend to your friends' list
async function addFriend() {
  let webID = session.info.webId;
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  let myProfileDocumentUrl = new URL(webID);
  myProfileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(myProfileDocumentUrl.href, {
    fetch: session.fetch,
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);
  webID = document.getElementById("webID").value;

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

  let profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";
  profile = addUrl(profile, FOAF.knows, webID);

  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);
  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(myProfileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch,
  });
}

//*Remove a friend from friends' list
async function removeFriend(id = null) {
  let webID = session.info.webId;
  let friendWebID;
  if (id) {
    friendWebID = id;
  } else {
    friendWebID = document.getElementById("webID").value;
  }
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  let myProfileDocumentUrl = new URL(webID);
  myProfileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(myProfileDocumentUrl.href, {
    fetch: session.fetch,
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);

  // friendWebID = document.getElementById("webID").value;

  profile = removeUrl(profile, FOAF.knows, friendWebID);

  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);
  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(myProfileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch,
  });
}

buttonLogin.onclick = function () {
  login();
};

//Updates Andrea Vitti
//*Event listeners added

buttonLogout.onclick = function () {
  exit();
  window.location.reload(true);
};

buttonFriend.onclick = async function () {
  buttonFriend.innerHTML = "<small>Friend added</small>";
  buttonRemove.innerHTML = "Remove Friend";

  let promise = new Promise((resolve, reject) => {
    addFriend();
  });

  promise.then(() => {
    buttonFriend.classList.remove("bg-success");
    buttonFriend.classList.add("d-none");

    buttonRemove.classList.remove("d-none");
  });
  readProfile();
};

buttonRemove.onclick = async function () {
  buttonRemove.innerHTML = "<small>Friend removed</small>";
  buttonFriend.innerHTML = "Add Friend";

  let promise = new Promise((resolve, reject) => {
    removeFriend();
  });

  promise.then(() => {
    buttonRemove.classList.remove("bg-danger");
    buttonRemove.classList.add("d-none");

    buttonFriend.classList.remove("d-none");
  });
  readProfile();
};

//Updates End Andrea Vitti

writeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  writeProfile();
});

readForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readProfile();
});
//Updates End Andrea Vitti

//Updates Andrea Vitti

//Shows spinner symbol in a label when associated value has pending changes
inputName.addEventListener("change", (event) => {
  document.querySelector("#writename").innerHTML =
    'Write your name: <i class="fa-solid fa-spinner"></i>';
  cname = true;
});

inputEmail.addEventListener("change", (event) => {
  document.querySelector("#writeemail").innerHTML =
    'Write your email: <i class="fa-solid fa-spinner"></i>';
  cemail = true;
});

inputBirth.addEventListener("change", (event) => {
  document.querySelector("#writebirth").innerHTML =
    'Write your birthday: <i class="fa-solid fa-spinner"></i>';
  cbirth = true;
});

inputGender.addEventListener("change", (event) => {
  document.querySelector("#writegender").innerHTML =
    'Select your gender: <i class="fa-solid fa-spinner"></i>';
  cgender = true;
});

inputCountry.addEventListener("change", (event) => {
  document.querySelector("#writecountry").innerHTML =
    'Select your country: <i class="fa-solid fa-spinner"></i>';
  ccountry = true;
});

inputPhoto.addEventListener("change", (event) => {
  document.querySelector("#writeimg").innerHTML =
    'Upload your profile pic: <i class="fa-solid fa-spinner"></i>';
});
//Updates End Andrea Vitti

//*Imported functions and objects
import {
  getPodUrlAll,
  getSourceUrl,
  getSolidDataset,
  saveSolidDatasetAt,
  getStringNoLocale,
  getStringNoLocaleAll,
  setStringNoLocale,
  getThing,
  createThing,
  setThing,
  getDate,
  getUrl,
  getUrlAll,
  setUrl,
  addUrl,
  removeUrl,
  overwriteFile,
} from "@inrupt/solid-client";

import { Session } from "@inrupt/solid-client-authn-browser";

//*And vocabularies

import { VCARD, SCHEMA_INRUPT, FOAF } from "@inrupt/vocab-common-rdf";

//*MAIN
const NOT_ENTERED_WEBID =
  "...not logged in yet - but enter any WebID to read from its profile...";

let session = new Session();

//Updates Andrea Vitti
let storage = []; //Array for storing data read or wrote on the profile

let podUrl; //logged user pod url

//flags for any vcard data to apply changes on - not required for the avatar
let cname, cemail, cbirth, ccountry;

//Get inputFields elements
const inputName = document.querySelector("#input_name");
const inputEmail = document.querySelector("#input_email");
const inputBirth = document.querySelector("#input_birth");
const inputCountry = document.querySelector("#input_country");
const inputPhoto = document.querySelector("#input_img");

//Get buttons elements
const buttonLogin = document.getElementById("btnLogin");
const buttonLoginAux = document.getElementById("btnLogin2");
const buttonLogout = document.getElementById("btnLogout");
const buttonToProfile = document.getElementById("btnToProfile");
const buttonFriend = document.getElementById("addfriend");
const buttonRemove = document.getElementById("removefriend");
//End Updates Andrea Vitti

const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");
const eventForm = document.getElementById("eventForm");

//Event inputFields
const inputTitle = document.getElementById("input_title");
const inputLocation = document.getElementById("input_place");
const inputStart = document.getElementById("input_start");
const inputEnd = document.getElementById("input_end");
const inputDescription = document.getElementById("input_description");

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
useLoading("show");
handleRedirectAfterLogin();
useLoading("hide");
//*End MAIN

//*FUNCTIONS
//*Login
async function login() {
  if (!session.info.isLoggedIn) {
    await session.login({
      oidcIssuer: document.getElementById("provider").value,
      clientName: "VCard Manager",
      redirectUrl: window.location.href,
    });
  }
}

//*Login Redirect.
/*Call session.handleIncomingRedirect() function.
When redirected after login, finish the process by retrieving session information.*/
async function handleRedirectAfterLogin() {
  await session.handleIncomingRedirect({
    restorePreviousSession: true, //this option allows to restore session from already authenticated user.
    url: window.location.href,
  });

  if (session.info.isLoggedIn) {
    // Update the page with the status.
    document.getElementById(
      "labelStatus"
    ).innerHTML = `<small>Your session is logged in with the WebID [<a target="_blank" class="longurl" href="${session.info.webId}">${session.info.webId}</a>].</small>`;
    document.getElementById("labelStatus").setAttribute("role", "alert");
    document.getElementById("webID").value = session.info.webId;

    //Updates Andrea Vitti
    podUrl = await getPodUrlAll(webID, { fetch: fetch }); //Fetch User's Pod Url
    //Read profile info after authentication
    readProfile();
  }
}

//*Logout
async function exit() {
  if (session.info.isLoggedIn) {
    await session.logout();
  }
}

//*Load Dataset
async function loadDataset(webID = session.info.webId) {
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  let profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";
  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let profileDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: session.fetch,
  });

  return { profileDataset, profileDocumentUrl };
}

//*Element Search
//If a property has more than one element (like hasAddress, hasEmail, knows), check if the value already exist in record
function elementSearch(dataset, urls, value) {
  let flag, currentThing, currentValue;
  urls.forEach((element) => {
    currentThing = getThing(dataset, element);
    currentValue = getUrl(currentThing, VCARD.value);

    if (value == currentValue) {
      flag = true;
    }
  });
  return flag;
}
//End Updates Andrea Vitti

//*Write to profile
async function writeProfile() {
  //Updates Andrea Vitti
  storage = [];
  const name = inputName.value;
  const email = inputEmail.value;
  const birthday = inputBirth.value;
  const country = inputCountry.value;

  const file = document.querySelector("#input_img")["files"][0];

  storage.push(name, email, birthday, country);

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
  profile = setStringNoLocale(profile, FOAF.name, name);

  // Updates Andrea Vitti

  // Email update
  const mailLink = "mailto:" + email;
  let mailThing, mailUrl, flag;
  let savedMails = getUrlAll(profile, VCARD.hasEmail);
  if (!savedMails) {
  } else {
    flag = elementSearch(myProfileDataset, savedMails, mailLink); //true if element is found
  }
  if (!flag) {
    console.log("No match found, writing new email in profile");

    //Create a new Thing and insert into Dataset
    mailThing = createThing();
    mailThing = setStringNoLocale(mailThing, SCHEMA_INRUPT.name, email);
    mailThing = setUrl(mailThing, VCARD.value, mailLink);
    myProfileDataset = setThing(myProfileDataset, mailThing);

    // Defines a url for the element related property , to link the Thing in the dataset
    mailUrl = mailThing.url.slice(46);
    mailUrl = profileDocumentUrl.href + "#" + mailUrl;
    profile = addUrl(profile, VCARD.hasEmail, mailUrl);
  } else {
    console.log("Mail already exist, not writing it");

    //This block removes the element from the array storage, used for showing which element are written or read during interaction with profiles
    let index = storage.indexOf(email);
    if (index !== -1) {
      storage.splice(index, 1);
    }
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

  //Address.country update
  let addressThing;
  let addressUrl = getUrl(profile, VCARD.hasAddress); //?For now, we work on a unique address, but many can be associated to profile

  if (addressUrl != null) {
    addressThing = getThing(myProfileDataset, addressUrl); //if there's already an address, you just need to import and modify the existing thing
  } else {
    //if it doesn't, a new thing needs to be initialized and linked inside user profile
    addressThing = createThing();
    addressUrl = addressThing.url.slice(46);
    addressUrl = profileDocumentUrl.href + "#" + addressUrl;
    profile = setUrl(profile, VCARD.hasAddress, addressUrl);
  }
  addressThing = setStringNoLocale(addressThing, VCARD.country_name, country);
  myProfileDataset = setThing(myProfileDataset, addressThing); //Update the dataset with the new address
  // End Address update

  //Avatar update
  //Instead of "c" flags, avatar modifications can be spotted by checking if there has been a file upload
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

  if (ccountry) {
    document.querySelector("#writecountry").innerHTML =
      'Select your country: <i class="fa-solid fa-check"></i>';
    ccountry = false;
  }

  readProfile(); //reload profile info at updates end
  //End Updates Andrea Vitti
}

//*Read profile
async function readProfile(id = null) {
  useLoading("show");
  if (session.info.isLoggedIn) {
    buttonLoginAux.classList.add("d-none");
    buttonLogout.classList.remove("d-none");
    buttonToProfile.classList.remove("d-none");

    let { profileDataset } = await loadDataset();

    let myProfile = getThing(profileDataset, session.info.webId);
    let myAvatar = getUrl(myProfile, VCARD.hasPhoto);
    let myFn = getStringNoLocale(myProfile, VCARD.fn);
    let element = document.querySelector("#navpic");
    element.setAttribute("src", myAvatar);
    element = document.querySelector("#navname");
    element.innerText = myFn;
  } else {
    buttonLoginAux.classList.remove("d-none");
    buttonLogout.classList.add("d-none");
    buttonToProfile.classList.add("d-none");
  }

  let webID;
  let input = document.getElementById("webID");
  const readStatus = document.querySelector("#readStatus");

  if (id) {
    webID = id;
  } else {
    webID = input.value;
  }

  input.value = webID;

  if (session.info.webId != webID) {
    readStatus.classList.remove("d-none");
  } else {
    //readStatus.classList.add("d-none");
  }

  if (webID == session.info.webId) {
    document.querySelector("#write").classList.remove("d-none");
    document.querySelector("#event").classList.remove("d-none");
  } else {
    document.querySelector("#write").classList.add("d-none");
    document.querySelector("#event").classList.add("d-none");
  }
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
    useLoading("hide");
    document.getElementById(
      "labelFN"
    ).textContent = `Entered value does not appear to be a WebID. `;

    return false;
  }

  let profile = getThing(userDataset, webID);

  // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

  //Updates by Andrea Vitti
  //Get vCard Info
  const formattedName = getStringNoLocale(profile, VCARD.fn);

  //TODO: Implementare per ogni hasEmail presente nel profilo
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
  inputCountry.value = formattedCountry;

  readStatus.firstElementChild.innerHTML =
    "Reading <b>" + formattedName + "</b>'s Profile";

  // Load profile info in vcard view
  loadCardInfo(
    formattedName,
    avatar,
    formattedEmail,
    formattedCountry,
    formattedBirth
  );

  //Get Friend List and update view
  loadFriendList();

  loadEventList();

  useLoading("hide");
}

//*Load vCard info
async function loadCardInfo(name, avatar, email, country, birth) {
  //Update the vcard modal with the retrieved values.
  document.getElementById("mh-1").innerHTML = `${name}'s vCard`;

  document.getElementById("mb-1").innerHTML = `
  <div class="row">
  <div class="col-sm-auto">
  <section>
  <img src="${avatar}" class="propic rounded">
  </section>
  </div>

  <div class="col-sm-auto">



  
  <section>
  <p id="field-name">
  <div class="row">
  <div class="col-4">Fullname:</div>
  <div class="col-8"><p class="value">${name}</p></div></p>
  </div>
  </section>

  <section>
 <p id="field-birth">
  <div class="row">
  <div class="col-4">Birthday:</div>
  <div class="col-8"><p class="value"> ${formatDate(birth)}</p></div></p>
  </div>
 </p>
 </section>




 
<section>
 <p id="field-email">
 <div class="row">
  <div class="col-4">Email:</div>
  <div class="col-8"><p class="value"><a href="mailto:${email}">${email}</a></p></div>
  </div>
  </p>
 </section>






   <section>
 <p id="field-country">
 
 <div class="row">
  <div class="col-4">Country:</div>
  <div class="col-8"><p class="value">${country}</p></div>
  </div>
  </p>
 </section>


  
</div>





  </div>

 

 
  `;

  //Show vcard modal footer for functions' buttons
  if (!session.info.isLoggedIn) {
    document.getElementById("vcardfooter").innerHTML =
      "<p class='text-center text-muted'>You must be authenticated to add this person to your friends list or sending a message</p>";
  }
}

//*Load friend list in the view
async function loadFriendList(id = null) {
  let myWebID;
  const loadedID = document.getElementById("webID").value;
  if (id) {
    myWebID = id;
  } else {
    if (session.info.isLoggedIn) {
      myWebID = session.info.webId;
    } else {
      myWebID = loadedID;
    }
  }

  let { profileDataset } = await loadDataset(loadedID);

  // The profile data is a "Thing" in the profile dataset.
  const profile = getThing(profileDataset, loadedID);
  const friendsUrl = getUrlAll(profile, FOAF.knows); //get url of all friends
  let friendsList = [];

  if (friendsUrl.length != 0) {
    for (let i = 0; i < friendsUrl.length; i++) {
      const personUrl = friendsUrl[i];
      const myFriendDataset = await getSolidDataset(personUrl, {});

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
  }

  //If user is logged, check if the opened profile is a friend of the user or not and change the button style in vcard modal
  if (myWebID) {
    let { profileDataset } = await loadDataset(myWebID);
    let myProfile = getThing(profileDataset, myWebID);
    let myFriends = getUrlAll(myProfile, FOAF.knows);

    if (myFriends.includes(loadedID)) {
      buttonFriend.classList.add("d-none");
      buttonRemove.innerText = "Remove Friend";
      buttonRemove.classList.remove("d-none");
    } else {
      buttonRemove.classList.add("d-none");
      buttonFriend.innerText = "Add Friend";
      buttonFriend.classList.remove("d-none");
    }
  }

  //End get friends list

  //Update the friends modal with the user friend list
  const formattedName = getStringNoLocale(profile, VCARD.fn);
  document.getElementById("mh-2").innerHTML = `${formattedName}'s Friend List`;
  if (friendsList.length != 0) {
    document.getElementById(
      "mb-2"
    ).innerHTML = `<div id="friendlist" class="d-grid gap-3"></div>`;

    const list = document.querySelector("#friendlist");
    let j = 0;

    for (let i = 0; i < friendsList.length; i++) {
      //Create a row every two elements
      if (j == 0 || j % 2 == 0) {
        list.innerHTML += `<div class="row" id="row${i}"></div>`;
      }

      j++;
      list.lastChild.innerHTML += `
<div class=col-6>
<div id="${friendsList[i]["url"]}" class="card">
 <button type="button" class="btn btn-danger auxbtnremove rounded" data-user="${friendsList[i]["url"]}" data-fn="${friendsList[i]["name"]}"> 
  <i class="fa-solid fa-xmark xmark" ></i></button>
  <img src="${friendsList[i]["avatar"]}" class="card-img-top friend-pic" alt="...">

 




  <div class="card-header text-center"><a href="#" class="auxbtnread value" data-user="${friendsList[i]["url"]}">${friendsList[i]["name"]}</a>
</div>
<div class="card-body d-none friend-card text-center d-flex justify-content-around">

</div>
</div>
</div>
</div> `;
    }

    list.addEventListener("click", (e) => {
      if (e.target.classList.contains("auxbtnremove")) {
        if (
          confirm(
            "Are you sure you want to remove " +
              e.target.getAttribute("data-fn") +
              " from your friends list?"
          ) == true
        ) {
          removeFriend(e.target.getAttribute("data-user"));
          buttonFriend.innerHTML = "Add Friend";

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
            ).innerHTML = `<p>No friends in list. </p> `;
          }
          readProfile();
        }
      }

      if (e.target.classList.contains("auxbtnread")) {
        readProfile(e.target.getAttribute("data-user"));
      }
    });
  } else {
    document.getElementById("mb-2").innerHTML = `<p>No friends in list. </p> `;
  }

  if (!session.info.isLoggedIn || myWebID != loadedID) {
    const friendCards = document.getElementsByClassName("auxbtnremove");
    for (let element of friendCards) {
      element.classList.add("d-none");
    }
  }
  /*
  <button type="button" class="btn btn-primary auxbtnread w-50" data-user="${friendsList[i]["url"]}"> 
  <i class="fa-solid fa-eye" > </i> </button>*/
}

//MODAL FUNCTION
function useLoading(option) {
  const loadinEl = document.getElementsByClassName("loading-wall")[0];
  if (option === "show") {
    loadinEl.style.display = "block";
  }
  if (option === "hide") {
    loadinEl.classList.add("loading-away");
    setTimeout(() => {
      loadinEl.style.display = "none";
      loadinEl.classList.remove("loading-away");
    }, 400);
  }
}

//*Add a friend
async function addFriend() {
  let { profileDataset, profileDocumentUrl } = await loadDataset();

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(profileDataset, profileDocumentUrl.href + "#me");
  let webID = document.getElementById("webID").value; //webID of the read profile
  profile = addUrl(profile, FOAF.knows, webID);

  // Write back the profile to the dataset.
  profileDataset = setThing(profileDataset, profile);

  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, profileDataset, {
    fetch: session.fetch,
  });
  loadFriendList();
}

//*Remove a friend from list
async function removeFriend(id = null) {
  let friendWebID;
  if (id) {
    friendWebID = id;
  } else {
    friendWebID = document.getElementById("webID").value;
  }
  let { profileDataset, profileDocumentUrl } = await loadDataset();

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(profileDataset, profileDocumentUrl.href + "#me");

  profile = removeUrl(profile, FOAF.knows, friendWebID);

  // Write back the profile to the dataset.
  profileDataset = setThing(profileDataset, profile);
  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, profileDataset, {
    fetch: session.fetch,
  });
  loadFriendList();
}

//*Load Events list
async function loadEventList(id = session.info.webId) {
  let myWebID;
  const loadedID = document.getElementById("webID").value;
  if (id) {
    myWebID = id;
  } else {
    if (session.info.isLoggedIn) {
      myWebID = session.info.webId;
    } else {
      myWebID = loadedID;
    }
  }

  let { profileDataset } = await loadDataset(loadedID);

  // The profile data is a "Thing" in the profile dataset.
  const profile = getThing(profileDataset, loadedID);
  const eventsUrl = getUrlAll(profile, "https://schema.org/events"); //get url of all events to which you are related
  console.log(eventsUrl);
  let eventsList = [];

  if (eventsUrl.length != 0) {
    for (let i = 0; i < eventsUrl.length; i++) {
      const eventUrl = eventsUrl[i];

      const eventThing = getThing(profileDataset, eventUrl);
      const eventName = getStringNoLocaleAll(eventThing, SCHEMA_INRUPT.name);
      const eventLocation = getUrl(eventThing, "https://schema.org/location");
      const organizer = getUrl(eventThing, "https://schema.org/organizer");
      const description = getStringNoLocale(
        eventThing,
        SCHEMA_INRUPT.description
      );
      const startDate = formatDate(
        getStringNoLocale(eventThing, SCHEMA_INRUPT.startDate)
      );
      const endDate = getStringNoLocale(eventThing, SCHEMA_INRUPT.endDate);

      const event = {
        name: eventName,
        location: eventLocation,
        organizer: organizer,
        description: description,
        startDate: startDate,
        endDate: endDate,
      };

      eventsList.push(event);
    }
  }
  console.log(eventsList);

  document.getElementById(
    "mb-3"
  ).innerHTML = `<div class="eventlist" id="eventlist"></div>`;

  let role; //Graphic element that shows your relationship with the event

  for (let i = 0; i < eventsList.length; i++) {
    if (eventsList[i]["organizer"] === myWebID) {
      console.log(eventsList[i]["organizer"]);
      role = '<small class="text-danger">Organizer</small>';
    } else {
      role = '<small class="text-info">Attendee</small>';
    }
    if (eventsList[i]["endDate"] == null) {
      eventsList[i]["endDate"] = "";
    } else {
      eventsList[i]["endDate"] = " to " + formatDate(eventsList[i]["endDate"]);
    }

    document.getElementById("eventlist").innerHTML += `<div
                href="#"
                class="list-group-item list-group-item-action py-2"
                aria-current="true"
              >
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1">${eventsList[i]["name"]}</h5>


                ${role}
                </div>
                <p class="mb-1">${eventsList[i]["description"]}</p>
                <small><p>${eventsList[i]["startDate"]}${eventsList[i]["endDate"]}</p></small>
              </div>`;
  }
  //<a href="${eventsList[i]["location"]}"><i class="fa-solid fa-location-dot"></i></a>
}

//*Event Creation
async function newEvent() {
  let eventThing = createThing();

  const title = inputTitle.value;
  const location = inputLocation.value;
  const startDate = inputStart.value;
  const endDate = inputEnd.value;
  const description = inputDescription.value;

  eventThing = setStringNoLocale(eventThing, SCHEMA_INRUPT.name, title);
  eventThing = setUrl(eventThing, "https://schema.org/location", location);

  let dateString = new Date(startDate)
    .toISOString()
    .split("T", 1)[0]; /*Convert the date in a string in format yyyy-mm-dd*/

  eventThing = setStringNoLocale(
    eventThing,
    SCHEMA_INRUPT.startDate,
    dateString
  );

  if (endDate) {
    dateString = new Date(endDate).toISOString().split("T", 1)[0];

    eventThing = setStringNoLocale(
      eventThing,
      SCHEMA_INRUPT.endDate,
      dateString
    );
  }

  eventThing = setStringNoLocale(
    eventThing,
    SCHEMA_INRUPT.description,
    description
  );

  console.log(eventThing);

  let { profileDataset, profileDocumentUrl } = await loadDataset();

  eventThing = addUrl(
    eventThing,
    SCHEMA_INRUPT.attendee,
    profileDocumentUrl.href + "#me"
  );

  eventThing = setUrl(
    eventThing,
    "https://schema.org/organizer",
    profileDocumentUrl.href + "#me"
  );

  //link the event to a list of events in your datas

  let eventUrl = eventThing.url.slice(46);
  eventUrl = profileDocumentUrl.href + "#" + eventUrl;

  let profile = getThing(profileDataset, profileDocumentUrl.href + "#me");
  profile = addUrl(profile, "https://schema.org/events", eventUrl);

  // Write back to the dataset.
  profileDataset = setThing(profileDataset, eventThing);
  profileDataset = setThing(profileDataset, profile);

  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, profileDataset, {
    fetch: session.fetch,
  });

  // Update the page with the retrieved values.
  const labelWriteStatus = document.getElementById("labelPublicationStatus");
  labelWriteStatus.innerHTML = `<dt>Event published!</dt>`;
  labelWriteStatus.setAttribute("role", "alert");

  loadEventList();
}

//*Date conversion
function formatDate(input) {
  var datePart = input.match(/\d+/g),
    year = datePart[0], //.substring(2), // get only two digits
    month = datePart[1],
    day = datePart[2];

  return day + "/" + month + "/" + year;
}

//*File upload in Container
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

//*End FUNCTIONS

//*LISTENERS
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

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  newEvent();
});

//Updates Andrea Vitti
buttonLogout.onclick = function () {
  exit();
  window.location.reload(true);
};

buttonToProfile.onclick = function () {
  readProfile(session.info.webId);
};

buttonFriend.onclick = async function () {
  useLoading("show");
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

//*Graphical feedbacks on profile info changes
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
//*End LISTENERS

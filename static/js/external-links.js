document.addEventListener("DOMContentLoaded", function () {
  var links = document.querySelectorAll("a[href^='http']");
  var internalDomain = "justin.vc"; // replace with your actual domain

  links.forEach(function (link) {
    if (
      link.hostname !== window.location.hostname &&
      link.hostname !== internalDomain &&
      !link.querySelector("svg") &&
      !link.classList.contains("no-external-icon") &&
      !link.closest(".meta-item")
    ) {
      var iconClass = "fa-external-link-alt"; // default icon
      if (link.hostname.includes("wikipedia.org")) {
        iconClass = "fa-wikipedia-w";
      }
      if (link.hostname.includes("github.com")) {
        iconClass = "fa-github";
      }
      // add more conditions for other domains here

      link.classList.add("external-link");
      link.setAttribute("data-icon", iconClass);
    }
  });
});

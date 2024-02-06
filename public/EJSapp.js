const { format } = require("validate.js");

function test() {
  console.log("Hello")
}

function dropDownFunction () {
    document.getElementById("myDropDown").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
          }
        }
      }
}


// const swiper = new Swiper('.swiper', {
//   // Optional parameters
//   spaceBetween: 15,
//   slidesPerView: 2,
//   loop: true,
//   freemode: true,
//   speed: 1000,

//   // Navigation arrows
//   navigation: {
//     nextEl: '.swiper-button-next',
//     prevEl: '.swiper-button-prev',
//   },
// });
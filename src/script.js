let lastScrollTop = 0;
let rotation = 0; // Unghiul inițial

window.addEventListener("scroll", function() {
    let flower = document.querySelector(".flower");
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    if (currentScroll > lastScrollTop) {
        // Scroll în jos -> floarea se rotește mai repede
        rotation += 15;
    } else {
        // Scroll în sus -> floarea se rotește invers
        rotation -= 15;
    }

    flower.style.transform = `rotate(${rotation}deg)`;
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});



// const scrollToTop = document.getElementById("scrollToTop");

// window.addEventListener("scroll", function() {
//     if (window.pageYOffset > 300) {
//         scrollToTop.style.display = "block";
//     } else {
//         scrollToTop.style.display = "none";
//     }
// });






document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector(".carousel");
    const testimonials = document.querySelectorAll(".testimonial");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    let index = 0;
    let interval;

    function updateCarousel() {
        const offset = -index * 100;
        carousel.style.transform = `translateX(${offset}%)`;
    }

    function nextTestimonial() {
        index = (index + 1) % testimonials.length;
        updateCarousel();
    }

    function prevTestimonial() {
        index = (index - 1 + testimonials.length) % testimonials.length;
        updateCarousel();
    }

    // Butoane manuale
    nextBtn.addEventListener("click", function () {
        clearInterval(interval);
        nextTestimonial();
        startAutoSlide();
    });

    prevBtn.addEventListener("click", function () {
        clearInterval(interval);
        prevTestimonial();
        startAutoSlide();
    });

    // Derulare automată
    function startAutoSlide() {
        interval = setInterval(nextTestimonial, 5000);
    }

    // Inițializează caruselul
    updateCarousel();
    startAutoSlide();
});



function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    nav.classList.toggle('active');
}
document.addEventListener("DOMContentLoaded", function () {
    const menuIcon = document.querySelector(".menu-icon");
    const navLinks = document.querySelector(".nav-links");

    menuIcon.addEventListener("click", function () {
        navLinks.classList.toggle("active");
    });
});



document.addEventListener("DOMContentLoaded", function () {
    const menuIcon = document.querySelector(".menu-icon");
    const navLinks = document.querySelector(".nav-links");

    menuIcon.addEventListener("click", function () {
        navLinks.classList.toggle("active");
        menuIcon.classList.toggle("open"); // Schimbă stilul butonului în "X"
    });
});


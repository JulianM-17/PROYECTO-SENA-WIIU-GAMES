/**
 * WiiU-Games - Index Animations (Corsair-Style)
 * Hero Slider, Scroll Animations, Drag-to-Scroll
 */
document.addEventListener("DOMContentLoaded", () => {
  initHeroSlider();
  initScrollAnimations();
  initDragToScroll();
});

/* =====================================================
   HERO SLIDER
   ===================================================== */
function initHeroSlider() {
  const slider = document.getElementById("heroSlider");
  if (!slider) return;

  const slides = slider.querySelectorAll(".hero-slide");
  const dots = slider.querySelectorAll(".hero-dot");
  const arrowLeft = slider.querySelector(".hero-arrow-left");
  const arrowRight = slider.querySelector(".hero-arrow-right");

  if (slides.length === 0) return;

  let currentSlide = 0;
  let autoplayInterval = null;
  const AUTOPLAY_DELAY = 6000;

  function goToSlide(index) {
    // Remove active from all slides and dots
    slides.forEach((slide) => {
      slide.classList.remove("active");
    });
    dots.forEach((dot) => dot.classList.remove("active"));

    // Set new active
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
  }

  function stopAutoplay() {
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }

  // Arrow event listeners
  if (arrowLeft) {
    arrowLeft.addEventListener("click", () => {
      prevSlide();
      startAutoplay();
    });
  }

  if (arrowRight) {
    arrowRight.addEventListener("click", () => {
      nextSlide();
      startAutoplay();
    });
  }

  // Dot event listeners
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const slideIndex = parseInt(dot.dataset.slide, 10);
      goToSlide(slideIndex);
      startAutoplay();
    });
  });

  // Pause autoplay on hover
  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  slider.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoplay();
  }, { passive: true });

  slider.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    startAutoplay();
  }, { passive: true });

  // Keyboard navigation
  slider.setAttribute("tabindex", "0");
  slider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
      startAutoplay();
    } else if (e.key === "ArrowRight") {
      nextSlide();
      startAutoplay();
    }
  });

  // Start autoplay
  startAutoplay();
}

/* =====================================================
   SCROLL ANIMATIONS (Intersection Observer)
   ===================================================== */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll("[data-animate]");

  if (animatedElements.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -60px 0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach((el) => observer.observe(el));
}

/* =====================================================
   DRAG TO SCROLL (for category carousel)
   ===================================================== */
function initDragToScroll() {
  const scrollContainers = document.querySelectorAll(
    ".categorias-carrusel"
  );

  scrollContainers.forEach((container) => {
    let isDown = false;
    let startX;
    let scrollLeft;
    let velocity = 0;
    let animFrame = null;

    container.addEventListener("mousedown", (e) => {
      isDown = true;
      container.classList.add("dragging");
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      velocity = 0;
      if (animFrame) cancelAnimationFrame(animFrame);
    });

    container.addEventListener("mouseleave", () => {
      if (isDown) {
        isDown = false;
        container.classList.remove("dragging");
        applyMomentum(container, velocity);
      }
    });

    container.addEventListener("mouseup", () => {
      if (isDown) {
        isDown = false;
        container.classList.remove("dragging");
        applyMomentum(container, velocity);
      }
    });

    container.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      velocity = x - startX - (container.scrollLeft - scrollLeft + walk);
      container.scrollLeft = scrollLeft - walk;
    });

    // Prevent click after drag
    container.addEventListener("click", (e) => {
      if (Math.abs(velocity) > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
}

function applyMomentum(container, velocity) {
  let currentVelocity = velocity * 0.5;

  function step() {
    if (Math.abs(currentVelocity) < 0.5) return;
    container.scrollLeft -= currentVelocity;
    currentVelocity *= 0.92;
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.slider');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.nav-dot');
    let currentIndex = 0;

    function goToSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slider.style.transform = `translateX(-${index * 100}%)`;
        currentIndex = index;
        updateDots();
    }

    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });

    // Otomatik geçiş için
    setInterval(() => goToSlide(currentIndex + 1), 5000);

    // İlk yükleme için
    updateDots();
});
// Dark Mode Toggler
document.addEventListener("DOMContentLoaded", function() {
    const toggleButton = document.getElementById("theme-toggle-btn");
    if(!toggleButton) return;

    // Load saved theme
    let currentTheme = localStorage.getItem("theme") || "light";
    if (currentTheme === "dark") {
        document.body.classList.add("dark-theme");
        toggleButton.innerHTML = "☀️";
    }

    toggleButton.addEventListener("click", function() {
        document.body.classList.toggle("dark-theme");
        if (document.body.classList.contains("dark-theme")) {
            localStorage.setItem("theme", "dark");
            toggleButton.innerHTML = "☀️";
        } else {
            localStorage.setItem("theme", "light");
            toggleButton.innerHTML = "🌙";
        }
    });
});

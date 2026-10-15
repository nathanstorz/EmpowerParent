// Burger menu: opens and closes the nav on small screens
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");

if (menuToggle && mainNav) {
    const setMenu = (open) => {
        mainNav.classList.toggle("open", open);
        menuToggle.classList.toggle("open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    menuToggle.addEventListener("click", () => {
        setMenu(!mainNav.classList.contains("open"));
    });

    // Escape closes the menu
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenu(false);
        }
    });
}
const root = document.documentElement;
const themeToggle = document.querySelector("[data-theme-toggle]");
const modalBackdrop = document.querySelector("[data-modal]");

const applyTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
};

const storedTheme = localStorage.getItem("ui-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
applyTheme(initialTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("ui-theme", nextTheme);
    applyTheme(nextTheme);
  });
}

const openModal = () => {
  if (modalBackdrop) {
    modalBackdrop.classList.add("active");
  }
};

const closeModal = () => {
  if (modalBackdrop) {
    modalBackdrop.classList.remove("active");
  }
};

document.querySelectorAll("[data-modal-open]").forEach((button) => {
  button.addEventListener("click", openModal);
});

document.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });
}

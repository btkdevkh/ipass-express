// DOM Elements
const ipassList = document.getElementById("ipass-list");

// Event Listeners
ipassList.addEventListener("click", (e) => {
  if (e.target.closest(".toggle-eye")) {
    const span = e.target.closest(".toggle-eye").querySelector("span");
    const button = e.target.closest(".toggle-eye").querySelector("button");
    const i = button.querySelector("i");

    if (i.classList.contains("fa-eye-slash")) {
      const master_password = window.prompt(
        "Please enter your master password :"
      );

      if (!master_password) return;

      fetch(
        `/api/v1/ipass/${button.dataset.id}?master_password=${master_password}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.msg) {
            alert(data.msg);
            return;
          }

          button.innerHTML = `<i class="fa-solid fa-eye"></i>`;
          span.innerText = data.reveal;
        });
    } else {
      if (e.target.nodeName === "SPAN") return;

      button.innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
      span.innerText = Array.from(span.innerText).fill("*").join("");
    }
  }
});
